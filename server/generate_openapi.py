#!/usr/bin/env python3
# generate_openapi.py

import os
import re
import sys
from pathlib import Path

SKIP_DIRECTORIES = {"node_modules", "static", "test", "Crow", ".git", "bin"}
SOURCE_EXTENSIONS = {".cpp", ".cc", ".cxx", ".hpp", ".h"}

def should_exclude_route(route_path):
    """Check if a route should be excluded from OpenAPI documentation."""
    exclude_patterns = [
        r'^/openapi\.yaml$',           # OpenAPI spec file
        r'^/static/swagger/',           # Swagger static files
        r'^/swagger/',                   # Swagger UI routes
        r'^/$',                           # Root route that redirects to Swagger
        r'^/static/<string>',
        r'^/swaggerui',
        r'crow_all.h',
        r'^/vcpkg/',
    ]
    
    for pattern in exclude_patterns:
        if re.match(pattern, route_path):
            return True
    return False

def extract_parameters(route_content, route_path):
    """Extract query parameters and body parameters from route implementation."""
    params = {
        'query': [],
        'body': []
    }
    
    # Look for url_params.get() calls which indicate query parameters
    query_pattern = r'url_params\.get\s*\(\s*["\']([^"\']+)["\']\s*\)'
    query_matches = re.finditer(query_pattern, route_content)
    for match in query_matches:
        param_name = match.group(1)
        if param_name not in params['query']:
            params['query'].append(param_name)
    
    # Look for JSON body parsing patterns
    body_patterns = [
        # Pattern for crow::json::load
        r'crow::json::load\s*\(\s*req\.body\s*\)',
        # Pattern for accessing JSON properties
        r'body_json\[\s*["\']([^"\']+)["\']\s*\]',
        r'body\[\s*["\']([^"\']+)["\']\s*\]',
        # Pattern for .s() calls on JSON values
        r'\[\s*["\']([^"\']+)["\']\s*\]\s*\.s\s*\(\s*\)',
        # Pattern for crow::json::rvalue access
        r'body\[["\']([^"\']+)["\']\]',
    ]
    
    # First check if this route handles JSON body
    has_json_body = False
    for pattern in body_patterns[:1]:  # Check the load pattern
        if re.search(pattern, route_content):
            has_json_body = True
            break
    
    if has_json_body:
        # Extract all property names accessed from the JSON body
        for pattern in body_patterns[1:]:  # Skip the first pattern (load pattern)
            body_matches = re.finditer(pattern, route_content)
            for match in body_matches:
                param_name = match.group(1)
                if param_name not in params['body'] and param_name:
                    params['body'].append(param_name)
    
    # Special case: check for specific patterns in your code
    if "/checkName" in route_path:
        # For your specific route, ensure Name is captured
        if "Name" not in params['body']:
            params['body'].append("Name")
    
    return params

def should_skip_file(filepath, root_directory, skip_directories):
    """Check if file should be skipped based on directory names."""
    try:
        relative_parts = filepath.relative_to(root_directory).parts
    except ValueError:
        # Fallback when paths are not directly comparable.
        relative_parts = filepath.parts
    return any(part in skip_directories for part in relative_parts[:-1])

def extract_balanced_brace_content(content, opening_brace_index):
    """Return content inside a balanced {...} block starting at opening brace."""
    if opening_brace_index < 0 or opening_brace_index >= len(content):
        return ""
    if content[opening_brace_index] != "{":
        return ""

    depth = 0
    for index in range(opening_brace_index, len(content)):
        char = content[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return content[opening_brace_index + 1:index]
    return ""

def extract_handler_body(handler_name, source_contents):
    """Find a function body for a route handler name across all scanned files."""
    candidates = [handler_name]
    if "::" in handler_name:
        candidates.append(handler_name.split("::")[-1])

    seen_candidates = set()
    for candidate in candidates:
        if candidate in seen_candidates:
            continue
        seen_candidates.add(candidate)

        # Match function definitions like:
        # void random_number(...){ ... }
        function_pattern = re.compile(
            rf'\b{re.escape(candidate)}\s*\([^;{{}}]*\)\s*\{{',
            re.DOTALL
        )
        for content in source_contents.values():
            for match in function_pattern.finditer(content):
                brace_index = content.find("{", match.start(), match.end() + 1)
                if brace_index == -1:
                    continue
                body = extract_balanced_brace_content(content, brace_index)
                if body:
                    return body
    return ""

def find_crow_routes(directory, skip_directories=None):
    """Recursively scan source files for Crow routes and their parameters."""
    routes = []
    root_directory = Path(directory).resolve()
    skip_directories = skip_directories or set()

    source_files = []
    source_contents = {}
    for filepath in root_directory.rglob("*"):
        if filepath.is_file() and filepath.suffix.lower() in SOURCE_EXTENSIONS:
            if not should_skip_file(filepath, root_directory, skip_directories):
                source_files.append(filepath)

    for filepath in source_files:
        try:
            with open(filepath, "r") as f:
                source_contents[filepath] = f.read()
        except Exception as e:
            print(f"Error reading {filepath}: {e}", file=sys.stderr)

    route_prefix = (
        r'CROW_ROUTE\s*\([^,]+,\s*"([^"]+)"\s*\)'
        r'(?:\s*\.methods\s*\(\s*"([^"]+)"_method\s*\))?\s*'
    )
    lambda_route_pattern = re.compile(
        route_prefix + r'\(\s*\[[^\]]*\]\s*\([^)]*\)\s*\{(.*?)\}\s*\)\s*;',
        re.DOTALL
    )
    handler_route_pattern = re.compile(
        route_prefix + r'\(\s*([A-Za-z_]\w*(?:::[A-Za-z_]\w*)*)\s*\)\s*;'
    )

    seen_routes = set()
    for filepath, content in source_contents.items():
        for match in lambda_route_pattern.finditer(content):
            route = match.group(1)
            method = match.group(2).lower() if match.group(2) else "get"
            route_body = match.group(3)

            if should_exclude_route(route):
                print(f"Excluding route: {route}")
                continue

            route_key = (route, method)
            if route_key in seen_routes:
                continue
            seen_routes.add(route_key)

            params = extract_parameters(route_body, route)
            route_file = str(filepath.relative_to(root_directory))
            routes.append({
                "path": route,
                "method": method,
                "file": route_file,
                "params": params
            })

            print(f"Found route: {method} {route} in {route_file}")
            if params["query"]:
                print(f"  Query params: {params['query']}")
            if params["body"]:
                print(f"  Body params: {params['body']}")

        for match in handler_route_pattern.finditer(content):
            route = match.group(1)
            method = match.group(2).lower() if match.group(2) else "get"
            handler_name = match.group(3)

            if should_exclude_route(route):
                print(f"Excluding route: {route}")
                continue

            route_key = (route, method)
            if route_key in seen_routes:
                continue
            seen_routes.add(route_key)

            route_body = extract_handler_body(handler_name, source_contents)
            params = extract_parameters(route_body, route) if route_body else {"query": [], "body": []}

            route_file = str(filepath.relative_to(root_directory))
            routes.append({
                "path": route,
                "method": method,
                "file": route_file,
                "params": params
            })

            print(f"Found route: {method} {route} in {route_file} (handler: {handler_name})")
            if params["query"]:
                print(f"  Query params: {params['query']}")
            if params["body"]:
                print(f"  Body params: {params['body']}")
    
    return routes

def generate_parameter_schema(params):
    """Generate OpenAPI parameter schema from extracted parameters."""
    yaml = ""
    
    # Query parameters
    if params['query']:
        for param in params['query']:
            yaml += f"""        - name: {param}
          in: query
          required: true
          schema:
            type: string
          description: {param} parameter
"""
    else:
        yaml += "        []\n"
    
    return yaml

def generate_request_body_schema(params):
    """Generate OpenAPI request body schema for JSON body parameters."""
    if not params['body']:
        return ""
    
    yaml = """      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
"""
    
    # Mark all body parameters as required (since your code expects them)
    for param in params['body']:
        yaml += f"""                - {param}
"""
    
    yaml += """              properties:
"""
    
    for param in params['body']:
        yaml += f"""                {param}:
                  type: string
                  description: {param} value
                  example: "example_{param}"
"""
    
    return yaml

def generate_openapi_yaml(routes, output_file="openapi.yaml"):
    """Generate OpenAPI YAML from found routes with parameters."""
    
    yaml_content = """openapi: 3.0.0
info:
  title: Crow API
  description: Auto-generated API documentation with parameter support
  version: 1.0.0
servers:
  - url: http://localhost:42069
    description: Local server
paths:
"""
    
    for route in routes:
        path_entry = f"""  {route['path']}:
    {route['method']}:
      summary: {route['method'].upper()} {route['path']}
      description: Auto-generated endpoint from {route['file']}
      parameters:
"""
        
        # Add parameters
        path_entry += generate_parameter_schema(route['params'])
        
        # Add request body if there are body parameters
        path_entry += generate_request_body_schema(route['params'])
        
        # Add responses
        path_entry += """      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
        '400':
          description: Bad request - missing or invalid parameters
"""
        yaml_content += path_entry
    
    yaml_content += """
components:
  schemas: {}
"""
    
    # Write the file
    with open(output_file, 'w') as f:
        f.write(yaml_content)
    
    print(f"Generated {output_file} with {len(routes)} routes")

def main():
    project_root = Path(os.getcwd()).resolve()
    routes = find_crow_routes(project_root, SKIP_DIRECTORIES)
    script_dir = Path(__file__).parent.absolute()
    # print(script_dir)
    output_file = script_dir / "static/openapi.yaml"
    print("Scanning for Crow routes and parameters...")
    # routes = find_crow_routes(script_dir)
    if not routes:
        print("No Crow routes found in .cpp files (excluding Swagger UI routes)")
        return
    generate_openapi_yaml(routes, output_file)
    print("\nFound routes with parameters (excluding Swagger UI):")
    for route in routes:
        print(f"  {route['method'].upper():<6} {route['path']}")
        if route['params']['query']:
            print(f"        Query params: {', '.join(route['params']['query'])}")
        if route['params']['body']:
            print(f"        Body params: {', '.join(route['params']['body'])}")

if __name__ == "__main__":
    main()
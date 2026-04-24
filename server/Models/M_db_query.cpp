#include"models.h"

namespace M_db_query{
    json check_user_in_db(int id){
        sqlite3_stmt* stmt;  // Local statement variable
        std::string sql = "SELECT * FROM users WHERE ID = @Id;";
        
        sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, 0);
        int index = sqlite3_bind_parameter_index(stmt, "@Id");
        sqlite3_bind_int(stmt, index, id);

        json result;  // Create json object to return
        
        if (sqlite3_step(stmt) == SQLITE_ROW) {
            // Get the actual data from the query
            int id = sqlite3_column_int(stmt, 0);  // First column (ID)
            const char* name = (const char*)sqlite3_column_text(stmt, 1);  // Second column (Name)
            const char* email = (const char*)sqlite3_column_text(stmt, 2);  // Third column (Email)
            
            // Put the actual data into the json
            result = json({
                {"ID", id},
                {"Name", name},
                {"EMAIL", email}
            });
        }
        
        sqlite3_finalize(stmt);  // Clean up
        return result;
    }
    json check_user_in_db(std::string name){
        sqlite3_stmt* stmt;  // Local statement variable
        std::string sql = "SELECT * FROM users WHERE Name = @Name;";
        
        sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, 0);
        int index = sqlite3_bind_parameter_index(stmt, "@Name");
        sqlite3_bind_text(stmt, index, name.c_str(),-1, SQLITE_TRANSIENT);

        json result;  // Create json object to return
        
        if (sqlite3_step(stmt) == SQLITE_ROW) {
            // Get the actual data from the query
            int id = sqlite3_column_int(stmt, 0);  // First column (ID)
            const char* name = (const char*)sqlite3_column_text(stmt, 1);  // Second column (Name)
            const char* email = (const char*)sqlite3_column_text(stmt, 2);  // Third column (Email)
            
            // Put the actual data into the json
            result = json({
                {"ID", id},
                {"Name", name},
                {"EMAIL", email}
            });
        }
        
        sqlite3_finalize(stmt);  // Clean up
        return result;
    }
    void checkName(crow::request& req, crow::response& res){
        auto body_json=crow::json::load(req.body);
        if (!body_json) {
            res.code = 400;
            res.body = "Invalid body JSON";
            res.end();
            return;
        }
        std::string name=body_json["Name"].s();
        res.set_header("Content-Type", "application/json");
        res.add_header("Access-Control-Allow-Origin", "*");
        
        auto data=check_user_in_db(name);
        res.body = data.dump();
        res.code = 200;
        res.end();
    }
    void checkUser(crow::request& req, crow::response& res){
        auto paramId=req.url_params.get("id");
        if(!paramId){
            res.body="id parameter missing!";
            res.code=400;
            res.end();
        }
        auto data=check_user_in_db(std::stoi(paramId));
        res.set_header("Content-Type", "application/json");
        res.add_header("Access-Control-Allow-Origin", "*");
        res.body=data.dump(); 
        res.code=200;
        res.end();
    }
}
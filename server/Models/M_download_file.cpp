#include"models.h"

namespace M_download_file{
    void downloaddatabase(crow::request& req, crow::response& res) {
        // Open the database file
        std::ifstream file(DATABASE_PATH, std::ios::binary);
        if (!file.is_open()) {
            res.code = 404;
            res.body = "Database file not found";
            res.end();
            return;
        }
        // Read the file contents
        std::stringstream buffer;
        buffer << file.rdbuf();
        // Set headers for file download
        res.add_header("Content-Type", "application/octet-stream");
        res.add_header("Content-Disposition", "attachment; filename=\"database.db\"");
        res.add_header("Access-Control-Allow-Origin", "*");
        
        // Send the file
        res.body = buffer.str();
        res.end();
    }
}
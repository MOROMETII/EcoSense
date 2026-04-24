#ifdef LINUX
#include<crow.h>
#else
#include"crow_all.h"
#endif
#include<sqlite3.h>
#include<string>
#include<vector>
#include<algorithm>

#include"main.h"
#include"Models/models.h"

signed main(){
    signed STATUS_CODE=0;

    env_data.load_file();
#ifdef LINUX
    mail.init(env_data.get_value("MAIL"),env_data.get_value("MAIL_PASSWORD"));
#endif

    crow::SimpleApp app;
    
    // Add CORS to each route instead
    auto add_cors = [](crow::response& res) {
        res.add_header("Access-Control-Allow-Origin", "*");
        res.add_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.add_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    };

    
    int rc=sqlite3_open(DATABASE_PATH.c_str(),&db);
    if(rc){
        std::cerr<<"failed to open db";
        goto RET;
    }

    // swaggerui route: (do not fucking touch it or it will break)
    CROW_ROUTE(app, "/swaggerui").methods("GET"_method)([](crow::request& req, crow::response& res) {
        res.redirect("/static/swagger/index.html");
        res.end();
    });

    // routes:
    CROW_ROUTE(app, "/downloaddatabase").methods("GET"_method)(M_download_file::downloaddatabase);
    CROW_ROUTE(app,"/checkUser").methods("GET"_method)(M_db_query::checkUser);
    CROW_ROUTE(app,"/checkName").methods("POST"_method)(M_db_query::checkName);
    CROW_ROUTE(app, "/random").methods("GET"_method)(M_random::random_number);
    
    app.bindaddr("0.0.0.0").port(42069).multithreaded().run(); // aparent portul trebe sa fie un uint16_t value, deci max: 65535
    
    END_PROCESSES:
    sqlite3_finalize(stmt);
    sqlite3_close(db);
    
    RET:
    return STATUS_CODE;
}
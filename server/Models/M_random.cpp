#include"models.h"
#include<random>

namespace M_random{
    std::string get_random_number(void){
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<> dis(1, 100);
        
        return std::to_string(dis(gen));
    }
    void random_number(crow::request& req, crow::response& res){
        res.add_header("Access-Control-Allow-Origin", "*");
        res.body=get_random_number();
        res.code=200;
        res.end();
    }
}
#pragma once
#include<unordered_map>
#include<string>

class env_loader{
private:
    std::unordered_map<std::string,std::string>content;
public:
    env_loader()=default;
    // ~env_loader(void);
    void load_file(void);
    std::string get_value(std::string key);
};
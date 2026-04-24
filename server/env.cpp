#include"env.h"
#include<fstream>
#include<iostream>

void env_loader::load_file(void){
    std::ifstream fin(".env");
    std::string line;
    while(std::getline(fin,line)){
        std::string trim_line=line.substr(0,line.find('#'));
        if(!trim_line.size())continue; // probably more checks needed for comments in the file
        
        size_t eq_pos=trim_line.find("=");
        std::string key=trim_line.substr(0,eq_pos);
        std::string val=trim_line.substr(eq_pos+2,trim_line.size()-(eq_pos+2)-1); // the second param is the fucking lenght not the end pos

        if(!key.size()||!val.size())continue;
        
        this->content[key]=val;
    }
    fin.close();
}

std::string env_loader::get_value(std::string key){
    return this->content.at(key);
}
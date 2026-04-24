#pragma once
#ifdef LINUX
#include<iostream>
#include<string>
#include<cstring>
#include<algorithm>
#include<cctype>
#include<cerrno>
#include<unistd.h>
#include<sys/socket.h>
#include<netinet/in.h>
#include<arpa/inet.h>
#include<netdb.h>
#include<openssl/ssl.h>
#include<openssl/err.h>

class mailpp{
private:
    std::string from="";
    std::string password=""; // Gmail App Password (not account password)
    hostent*server;
    int sock;
    sockaddr_in addr{};
    timeval tv{};
    SSL_CTX*ctx;
    SSL*ssl;
    static bool sendCmdSocket(int sock,const std::string&cmd,int expectedCode,const char*step);
    static bool readSmtpResponseTls(SSL*ssl,int expectedCode,const char*step);
    static bool isSmtpResponseComplete(const std::string&full);
    static bool isDigits3(const std::string&s);
    static bool readSmtpResponseSocket(int sock,int expectedCode,const char*step);
    static int parseSmtpCode(const std::string&full);
    static bool sendCmdTls(SSL*ssl,const std::string&cmd,int expectedCode,const char*step);
    static std::string base64Encode(const std::string&in);
public:
    mailpp()=default;
    // mailpp(std::string _from,std::string _password);
    void init(std::string _from,std::string _password);
    ~mailpp();
    int send_mail(std::string to,std::string subject="",std::string body="");
};
#endif
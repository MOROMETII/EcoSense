#include"mail++.h"

#ifdef LINUX
void mailpp::init(std::string _from,std::string _password){
    if(_from==""||_from.empty()||_password==""||_password.empty()){
        throw("Invalid Credentials in Constructor");
        return;
    }

    // mail and password init
    this->from=_from;
    _password.erase( // google app passwords somethimes have spaces in them, we don't want that
        std::remove_if(
            _password.begin(),
            _password.end(),
            [](unsigned char c){
                return std::isspace(c);
            }
        ),
        _password.end()
    );
    this->password=_password;
    
    // smtp connection init
    this->server=gethostbyname("smtp.gmail.com");
    if(this->server==nullptr){
        throw("DNS lookup failed.");
        return;
    }

    // socket init 
    this->sock=socket(AF_INET, SOCK_STREAM, 0);
    if(this->sock<0){
        throw("Socket creation failed.");
        return;
    }

    // addr init
    this->addr.sin_family = AF_INET;
    this->addr.sin_port = htons(587); // Gmail submission port
    std::memcpy(&this->addr.sin_addr.s_addr,this->server->h_addr,this->server->h_length);
    if(connect(this->sock, reinterpret_cast<sockaddr*>(&this->addr), sizeof(this->addr))<0){
        close(this->sock);
        throw("Connect failed.");
        return;
    }

    this->tv.tv_sec = 15;
    this->tv.tv_usec = 0;
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));

    if(!readSmtpResponseSocket(sock,220,"greeting"))return;
    if(!sendCmdSocket(sock,"EHLO localhost\r\n",250,"EHLO"))return;
    if(!sendCmdSocket(sock,"STARTTLS\r\n",220,"STARTTLS"))return;

    SSL_library_init();
    SSL_load_error_strings();
    OpenSSL_add_ssl_algorithms();

    // ctx init
    this->ctx=SSL_CTX_new(TLS_client_method());
    if(!this->ctx){
        close(this->sock);
        throw("TLS context creation failed.");
        return;
    }

    // ssl init
    this->ssl=SSL_new(this->ctx);
    if(!this->ssl){
        SSL_CTX_free(this->ctx);
        close(this->sock);
        throw("TLS object creation failed.");
        return;
    }

    SSL_set_fd(this->ssl,this->sock);
    SSL_set_tlsext_host_name(this->ssl,"smtp.gmail.com");
    if(SSL_connect(this->ssl)<=0){
        SSL_free(this->ssl);
        SSL_CTX_free(this->ctx);
        close(this->sock);
        throw("TLS handshake failed.");
        return;
    }

    if(!sendCmdTls(this->ssl,"EHLO localhost\r\n",250,"EHLO over TLS")){
        throw("EHLO localhost failed");
        return;
    }
    if(!sendCmdTls(this->ssl,"AUTH LOGIN\r\n",334,"AUTH LOGIN")){
        throw("AUTH LOGIN FAILED");
        return;
    }
    if(!sendCmdTls(this->ssl,base64Encode(this->from)+"\r\n",334,"username")){
        throw("Username setting failed");
        return;
    }
    if(!sendCmdTls(this->ssl,base64Encode(this->password)+"\r\n",235,"password")){
        throw("Password setting failed");
        return;
    }
}


mailpp::~mailpp() {
    if(this->ssl){
        sendCmdTls(this->ssl,"QUIT\r\n",221,"QUIT"); // ignore result in dtor
        SSL_shutdown(this->ssl);
        SSL_free(this->ssl);
    }
    if(this->ctx)SSL_CTX_free(this->ctx);
    if(this->sock>=0)close(this->sock);
}

bool mailpp::isSmtpResponseComplete(const std::string&full){
    std::size_t firstEnd = full.find("\r\n");
    if (firstEnd == std::string::npos || firstEnd < 4) return false;
    
    std::string firstLine = full.substr(0, firstEnd);
    if (!isDigits3(firstLine)) return true; // non-standard, but stop to avoid hanging
    std::string code = firstLine.substr(0, 3);
    
    if (firstLine[3] == ' ') return true;
    if (firstLine[3] != '-') return true;
    
    // Multiline response: complete when we see "XYZ " line.
    std::size_t start = firstEnd + 2;
    while (start < full.size()) {
        std::size_t end = full.find("\r\n", start);
        if (end == std::string::npos) return false;
        std::string line = full.substr(start, end - start);
        if (line.size() >= 4 && line.compare(0, 3, code) == 0 && line[3] == ' ') return true;
        start = end + 2;
    }
    return false;
}

bool mailpp::isDigits3(const std::string&s){
    return (
        s.size()>=3&&
        std::isdigit(static_cast<unsigned char>(s[0]))&&
        std::isdigit(static_cast<unsigned char>(s[1]))&&
        std::isdigit(static_cast<unsigned char>(s[2]))
    );
}

bool mailpp::sendCmdSocket(int sock,const std::string&cmd,int expectedCode,const char*step){
    std::cout << "C: " << cmd;
    if (send(sock, cmd.c_str(), cmd.size(), 0) < 0) {
        std::cerr << step << " failed: write error\n";
        return false;
    }
    return readSmtpResponseSocket(sock, expectedCode, step);
}

bool mailpp::readSmtpResponseTls(SSL*ssl,int expectedCode,const char*step){
    std::string full;
    char chunk[2048];
    while(true){
        std::memset(chunk,0,sizeof(chunk));
        int n=SSL_read(ssl,chunk,sizeof(chunk)-1);
        if(n<=0){
            int err=SSL_get_error(ssl,n);
            std::cerr<<step<<" failed: TLS read error (" << err << ")\n";
            std::cerr<<step<<" failed: no server response\n";
            return false;
        }
        full.append(chunk,n);
        if(isSmtpResponseComplete(full))break;
    }
    std::cout<<"S: "<<full;
    int code=parseSmtpCode(full);
    if(code!=expectedCode){
        std::cerr<<step<<" failed: expected "<<expectedCode<<", got "<<code<<"\n";
        return false;
    }
    return true;
}

bool mailpp::readSmtpResponseSocket(int sock,int expectedCode,const char*step){
    std::string full;
    char chunk[2048];
    while(true){
        std::memset(chunk,0,sizeof(chunk));
        int n=recv(sock,chunk,sizeof(chunk)-1,0);
        if(n<=0){
            if(errno==EAGAIN||errno==EWOULDBLOCK){
                std::cerr<<step<<" failed: read timeout\n";
            }else{
                std::cerr<<step<<" failed: no server response\n";
            }
            return false;
        }
        full.append(chunk, n);
        if(isSmtpResponseComplete(full))break;
    }
    std::cout<<"S: "<<full;
    int code=parseSmtpCode(full);
    if(code!=expectedCode){
        std::cerr<<step<<" failed: expected "<<expectedCode<<", got "<<code<<"\n";
        return false;
    }
    return true;
}

int mailpp::parseSmtpCode(const std::string&full){
    if(full.size()<3||!isDigits3(full.substr(0,3)))return -1;
    return std::atoi(full.substr(0, 3).c_str());
}

bool mailpp::sendCmdTls(SSL*ssl,const std::string&cmd,int expectedCode,const char*step){
    std::cout << "C: " << cmd;
    if (SSL_write(ssl, cmd.c_str(), static_cast<int>(cmd.size())) <= 0) {
        std::cerr << step << " failed: TLS write error\n";
        return false;
    }
    return readSmtpResponseTls(ssl, expectedCode, step);
}

int mailpp::send_mail(std::string to,std::string subject,std::string body){
    if(!sendCmdTls(this->ssl,"MAIL FROM:<"+this->from+">\r\n",250,"MAIL FROM"))return 1;
    if(!sendCmdTls(this->ssl,"RCPT TO:<"+to+">\r\n",250,"RCPT TO"))return 1;
    if(!sendCmdTls(this->ssl,"DATA\r\n",354,"DATA"))return 1;
    std::string data=
    std::string("From: ")+this->from+"\r\n"+
    "To: "+to+"\r\n"+
    "Subject: "+subject+"\r\n\r\n"+
    body+"\r\n.\r\n";
    if(!sendCmdTls(ssl,data,250,"message body"))return 1;
    return 0;
}

std::string mailpp::base64Encode(const std::string&in){
    // voodoo magic
    static const char*table="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    std::string out;
    int val=0,valb=-6;
    for(unsigned char c:in){
        val=(val<<8)+c;
        valb+=8;
        while(valb>=0){
            out.push_back(table[(val>>valb)&0x3F]);
            valb-=6;
        }
    }
    if(valb>-6)out.push_back(table[((val<<8)>>(valb+8))&0x3F]);
    while(out.size()%4)out.push_back('=');
    return out;
}
// mailpp::mailpp(std::string _from,std::string _password){
//     if(_from==""||_from.empty()||_password==""||_password.empty()){
//         throw("Invalid Credentials in Constructor");
//         return;
//     }

//     // mail and password init
//     this->from=_from;
//     _password.erase( // google app passwords somethimes have spaces in them, we don't want that
//         std::remove_if(
//             _password.begin(),
//             _password.end(),
//             [](unsigned char c){
//                 return std::isspace(c);
//             }
//         ),
//         _password.end()
//     );
//     this->password=_password;
//     // smtp connection init
//     this->server=gethostbyname("smtp.gmail.com");
//     if(this->server==nullptr){
//         throw("DNS lookup failed.");
//         return;
//     }

//     // socket init 
//     this->sock=socket(AF_INET, SOCK_STREAM, 0);
//     if(this->sock<0){
//         throw("Socket creation failed.");
//         return;
//     }

//     // addr init
//     this->addr.sin_family = AF_INET;
//     this->addr.sin_port = htons(587); // Gmail submission port
//     std::memcpy(&this->addr.sin_addr.s_addr,this->server->h_addr,this->server->h_length);
//     if(connect(this->sock, reinterpret_cast<sockaddr*>(&this->addr), sizeof(this->addr))<0){
//         close(this->sock);
//         throw("Connect failed.");
//         return;
//     }

//     this->tv.tv_sec = 15;
//     this->tv.tv_usec = 0;
//     setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));

//     if(!readSmtpResponseSocket(sock,220,"greeting"))return;
//     if(!sendCmdSocket(sock,"EHLO localhost\r\n",250,"EHLO"))return;
//     if(!sendCmdSocket(sock,"STARTTLS\r\n",220,"STARTTLS"))return;

//     SSL_library_init();
//     SSL_load_error_strings();
//     OpenSSL_add_ssl_algorithms();

//     // ctx init
//     this->ctx=SSL_CTX_new(TLS_client_method());
//     if(!this->ctx){
//         close(this->sock);
//         throw("TLS context creation failed.");
//         return;
//     }

//     // ssl init
//     this->ssl=SSL_new(this->ctx);
//     if(!this->ssl){
//         SSL_CTX_free(this->ctx);
//         close(this->sock);
//         throw("TLS object creation failed.");
//         return;
//     }

//     SSL_set_fd(this->ssl,this->sock);
//     SSL_set_tlsext_host_name(this->ssl,"smtp.gmail.com");
//     if(SSL_connect(this->ssl)<=0){
//         SSL_free(this->ssl);
//         SSL_CTX_free(this->ctx);
//         close(this->sock);
//         throw("TLS handshake failed.");
//         return;
//     }

//     if(!sendCmdTls(this->ssl,"EHLO localhost\r\n",250,"EHLO over TLS")){
//         throw("EHLO localhost failed");
//         return;
//     }
//     if(!sendCmdTls(this->ssl,"AUTH LOGIN\r\n",334,"AUTH LOGIN")){
//         throw("AUTH LOGIN FAILED");
//         return;
//     }
//     if(!sendCmdTls(this->ssl,base64Encode(this->from)+"\r\n",334,"username")){
//         throw("Username setting failed");
//         return;
//     }
//     if(!sendCmdTls(this->ssl,base64Encode(this->password)+"\r\n",235,"password")){
//         throw("Password setting failed");
//         return;
//     }
// }
#endif
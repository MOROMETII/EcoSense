CREATE TABLE users (
    ID int NOT NULL AUTO_INCREMENT,
    Username varchar(50) NOT NULL,
    Password varchar(255) NOT NULL,
    Mail varchar(50) NOT NULL,
    PRIMARY KEY (ID)
);

ALTER TABLE users ADD COLUMN devices varchar(255);
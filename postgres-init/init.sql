-- Create Development DB
CREATE DATABASE gamersaloon;
CREATE USER root_user WITH PASSWORD 'Matrix2510//++!';
GRANT ALL PRIVILEGES ON DATABASE gamersaloon TO root_user;

-- Create Test DB
CREATE DATABASE gamesaloon_test;
GRANT ALL PRIVILEGES ON DATABASE gamesaloon_test TO root_user;

-- Create Production DB
CREATE DATABASE opentournament_prod;
GRANT ALL PRIVILEGES ON DATABASE opentournament_prod TO root_user;

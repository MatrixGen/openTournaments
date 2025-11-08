-- Create Development DB
CREATE DATABASE IF NOT EXISTS gamersaloon;
CREATE USER IF NOT EXISTS 'root_user'@'%' IDENTIFIED BY 'Matrix2510//++!';
GRANT ALL PRIVILEGES ON gamersaloon.* TO 'root_user'@'%';

-- Create Test DB
CREATE DATABASE IF NOT EXISTS gamesaloon_test;
GRANT ALL PRIVILEGES ON gamesaloon_test.* TO 'root_user'@'%';

-- Create Production DB
CREATE DATABASE IF NOT EXISTS opentournament_prod;
GRANT ALL PRIVILEGES ON opentournament_prod.* TO 'root_user'@'%';

-- Apply changes
FLUSH PRIVILEGES;

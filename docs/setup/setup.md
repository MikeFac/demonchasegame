# Setup and Installation

## Prerequisites
- **Node.js**: Required to run the game server.
- **PHP**: Required to fetch Bible verses from the database.
- **MySQL Database**: Required for the content (Bible verses).

## Database Setup
1.  Ensure you have a MySQL database running.
2.  Configure the connection details in `database.php`.
    ```php
    $servername = "localhost";
    $username = "YOUR_USERNAME";
    $password = "YOUR_PASSWORD";
    $dbname = "christia_bible_analysis";
    ```
3.  The database should have a `category_verses` table and `engromweb` table as referenced in `database.php`.

## Installation
1.  Navigate to the project directory.
2.  Install Node.js dependencies:
    ```bash
    npm install
    ```

## Running the Server
Start the Node.js server:
```bash
node server.js
```
The server will start on port 3500 (or `PORT` env var).

## Running the PHP Backend
Ensure your PHP server is running and accessible. The game expects `get_verses.php` to be available. You may need to run this on a LAMP/WAMP stack or use `php -S`.

For development (simulating the PHP backend):
```bash
php -S localhost:8000
```
*Note: The current `game.js` expects `get_verses.php` at the same origin. You may need to configure a proxy or run everything under one origin.*

## Accessing the Game
Open your browser and navigate to:
http://localhost:3500

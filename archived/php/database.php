<?php
$servername = "localhost";
$username = "christia_ban";
$password = "FHHDjejw#322";
$dbname = "christia_bible_analysis";

// Create a connection
$conn = new mysqli($servername, $username, $password, $dbname);


// Check the connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);  
}

$conn->set_charset("utf8mb4");

function getVersesByCategory($category) {
    global $conn;
    $verses = array();

    $sql = "SELECT cv.Category, cv.Reference, e.text 
            FROM category_verses cv
            INNER JOIN engromweb e ON cv.Reference = e.reference";
    if ($category != '') {
        $sql = $sql . " WHERE cv.Category = '$category'";
    }
    
    //echo $sql;
    $result = $conn->query($sql);

    if (!$result) {
        error_log("Error executing query: " . $conn->error);
        throw new Exception("Failed to execute query.");
    }

    while ($row = $result->fetch_assoc()) {
        $verses[] = array(
            'category' => $row['Category'],
            'Reference' => $row['Reference'],
            'Text' => $row['text']
        );
    }

    // Print the contents of the $verses array for debugging
    //error_log("Verses retrieved: " . print_r($verses, true));

    return $verses;
}
?>

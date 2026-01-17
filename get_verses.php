<?php
// Enable error reporting
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Include the database connection file
include 'database.php';

// Get the category from the URL query string
$category = isset($_GET['category']) ? $_GET['category'] : '';

try {
    // Retrieve verses from the database based on the category
    $verses = getVersesByCategory($category);

    // Return the verses as JSON response
    header('Content-Type: application/json');
    echo json_encode($verses);
} catch (Exception $e) {
    // Handle any exceptions that occur during verse retrieval
    error_log("Error retrieving verses: " . $e->getMessage());
    print($e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'An error occurred while retrieving verses.']);
}
?>
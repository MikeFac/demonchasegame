<?php
header("Cache-Control: no-cache, must-revalidate"); // HTTP 1.1.
header("Pragma: no-cache"); // HTTP 1.0.
header("Expires: 0"); // Proxies.
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demon Chase Game</title>
  <style>
    canvas {
      border: 1px solid black;
    }
  </style>
</head>
<?php
$category = isset($_GET['category']) ? $_GET['category'] : '';
?>
<body>
  <canvas id="gameCanvas" width="800" height="600"></canvas>
  
  <script src="bible-verses.js"></script>
  <script>var gameCategory = "<?php echo $category; ?>";</script>
  <script src="game.js?v=1.02"></script>
</body>
</html>
<?php

require_once __DIR__ . '/vendor/autoload.php';

use Nette\Utils\Arrays;

function handler($event, $context)
{
  return Arrays::contains([1, 2, 3], 1);
}

<?php

$report = json_decode(file_get_contents('./.git/report.json'), true);

if($report['totals']['errors'] > 0) exit(1);
exit(0);

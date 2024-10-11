@echo off
 
call autoflake .
call black .
call flake8 .
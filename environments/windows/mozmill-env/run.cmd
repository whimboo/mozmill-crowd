@echo off

SET MOZMILLDRIVE=%~d0%
SET MOZMILLPATH=%~p0%
SET MOZMILL=%MOZMILLDRIVE%%MOZMILLPATH%

SET PATH=%PATH%;%MOZMILL%\python26\;%MOZMILL%\python26\Scripts

SET CMD=cmd
IF %1!==! goto start
set CMD=%1

:start
cd "%MOZMILL%"
%CMD% "%*"

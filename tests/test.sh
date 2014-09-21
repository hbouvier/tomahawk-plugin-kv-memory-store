#!/bin/sh

echo GET MyKey: Expecting 404
curl -v -X GET http://localhost:8080/store/api/v1/key/MyKey 2>&1 | grep HTTP | grep '<' | awk '{print $3}'

echo SET MyKey a small value
curl -v -X PUT http://localhost:8080/store/api/v1/key/MyKey -d 'a small value' 2>&1 | grep HTTP | grep '<' | awk '{print $3}'

echo GET MyKey: Expecting 'a small value'
curl -X GET http://localhost:8080/store/api/v1/key/MyKey
echo

echo DELETE MyKey
curl -v -X DELETE http://localhost:8080/store/api/v1/key/MyKey 2>&1 | grep HTTP | grep '<' | awk '{print $3}'

echo GET MyKey: Expecting 404
curl -v -X GET http://localhost:8080/store/api/v1/key/MyKey 2>&1 | grep HTTP | grep '<' | awk '{print $3}'

echo 'SET GET famille: Expcting []'
curl -X GET http://localhost:8080/store/api/v1/set/famille
echo 

echo 'SET GET famille[bob]: expecting 404'
curl -v -X GET http://localhost:8080/store/api/v1/set/famille/bob 2>&1 | grep HTTP | grep '<' | awk '{print $3}'

echo 'SET ADD famille[bob]'
curl -v -X PUT http://localhost:8080/store/api/v1/set/famille -d 'bob' 2>&1 | grep HTTP | grep '<' | awk '{print $3}'

echo 'SET GET famille[bob]'
curl -v -X GET http://localhost:8080/store/api/v1/set/famille/bob 2>&1 | grep HTTP | grep '<' | awk '{print $3}'
echo

echo 'SET DELETE famille[bob]'
curl -v -X DELETE http://localhost:8080/store/api/v1/set/famille/bob 2>&1 | grep HTTP | grep '<' | awk '{print $3}'

echo 'SET GET famille[bob]: Expecting 404'
curl -v -X GET http://localhost:8080/store/api/v1/set/famille/bob 2>&1 | grep HTTP | grep '<' | awk '{print $3}'

echo 'SET DELETE famille[bob]'
curl -v -X DELETE http://localhost:8080/store/api/v1/set/famille/bob  2>&1 | grep HTTP | grep '<' | awk '{print $3}'

echo 'SET DELETE famille'
curl -v -X DELETE http://localhost:8080/store/api/v1/set/famille\?force\=true 2>&1 | grep HTTP | grep '<' | awk '{print $3}'

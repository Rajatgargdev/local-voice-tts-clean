# local-voice-tts

<!-- Enviorement setup  -->

install git , node , python version 3.10.4 , npm

copy the https url from the github repo

<!-- to start the server  -->

step 1 : Clone using git clone url
step 2 : cd : local-voice-tts/server
step 3 : pip install coqui-tts
step 4 : pip install fast-api
step 5 : pip install uvicorn
step 6 : pip install -r requirements.txt

<!-- create the virtual enviorment     -->

step 7 :python -m venv venv

<!-- to activagte the venv -->

step 8 : venv\Scripts\activate
step 9 : uvicorn main:app --reload

<!-- to start the client  -->

step 1 : set the current path to .....local-voice-tts/app
step 2 : npm install
step 3 : npm start
step 4 : copy the url of localhost:3000 and paste in browser

nvidia-smi

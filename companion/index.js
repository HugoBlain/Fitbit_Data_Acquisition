import { inbox } from "file-transfer";


var valuesPerRecord = 11;     // permet de decomposer le buffer recu de la montre


// Traite les fichiers de la boite de réception un par un tant qu'il y en a
async function processAllFiles() {
  let file;
  let cmpt = 0;
  while ((file = await inbox.pop())) {
    const dataBuffer = await file.arrayBuffer();
    const dataBufferView = new Int8Array(dataBuffer);
    const recordCount = dataBufferView.length / valuesPerRecord;
    for (let i = 0; i < recordCount; i++) {
      let texte = dataBufferView[i*valuesPerRecord]+"-"+dataBufferView[i*valuesPerRecord+1]+"-"+dataBufferView[i*valuesPerRecord+2]+" "+dataBufferView[i*valuesPerRecord+3]+":"+dataBufferView[i*valuesPerRecord+4]+":"+dataBufferView[i*valuesPerRecord+5]+":"+dataBufferView[i*valuesPerRecord+6]+" bpm="+dataBufferView[i*valuesPerRecord+7]+" x="+dataBufferView[i*valuesPerRecord+8]+" y="+dataBufferView[i*valuesPerRecord+9]+" z="+dataBufferView[i*valuesPerRecord+10];
      if(i%10 == 0) {
        post(texte);
        //console.log(texte);
      }
    }
    cmpt += 1;
  }
  console.log("[Inbox] " + cmpt + " fichiers traités depuis la boite de reception!");
}



// permet de poster un record sur le serveur flask
function post(record) {
  let url = "http://localhost:5000/record/"
  fetch(url + record, {
    method: "PUT",
    /*
    headers: {
      "Authorization": `Bearer ${accessToken}`
    }
    */
  })
  .then(function(res) {
    return res.text();
  })
  .then(function(data) {
    console.log("Réponse = " + data);
  })
  .catch(function (err) {
    console.error("Fetch erreur " + err);
  });
}


// Lance le traitement de la boite de reception à chaque fois qu'un nouveau arrive
inbox.addEventListener("newfile", processAllFiles);

// Au lancement de l'appli sur le compagnon, on lance d'office un traitement de la boite de reception au cas ou des fichiers seraient arrivés quand l'appli ne tournait pas
processAllFiles();




















/*
function lectureFlask() {
  let url = "http://localhost:5000/"

  console.log("post go");
  fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`
    }
  })
  .then(function(res) {
    return res.text();
  })
  .then(function(data) {
    console.log("Data = " + data);
  })
  .catch(function (err) {
    console.error("Fetch erreur " + err);
  });
}
*/

/*
fetch(`https://api.fitbit.com/1.2/user/-/sleep/date/${todayDate}.json`, {
  method: "GET",
  headers: {
    "Authorization": `Bearer ${accessToken}`
  }
})
.then(function(res) {
  return res.json();
})
.then(function(data) {
  let myData = {
    totalMinutesAsleep: data.summary.totalMinutesAsleep
  }
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send(myData);
  }
})
.catch(err => console.log('[FETCH]: ' + err));
*/

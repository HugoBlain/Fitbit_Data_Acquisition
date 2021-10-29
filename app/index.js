import clock from "clock";                                  // developper une horloge
import * as fs from "fs";                                   // lire & écrire dans des fichiers
import { HeartRateSensor } from "heart-rate";               // capteur rythme cardiaque
import { BodyPresenceSensor } from "body-presence";         // capteur de présence  
import { Accelerometer } from "accelerometer";              // capteur accéléromètre
import { me as appbit } from "appbit";                      // infos sur l'appli et sur la montre
import * as document from "document";                       // manipuler les élements affichés
import { outbox } from "file-transfer";                     // communication montre -> compagnon



console.warn("---------- Lancement ----------");


var samplingFrequency = 1;                             // échantillonnage à 1Hz = 1 par seconde

var bodyPresenceSensor;                                 // déclaration capteur de présence
var heartRateSensor;                                    // déclaration capteur cardiaque
var accelerometerSensor;                                // déclaration capteur accéléromètre

var parametersFile = "parameters.txt";                  // nom du fichier contenant des infos pour le fonctionnement

var fileDescriptor;                                     // permet l'ouverture et la fermeture du flux pour l'écriture et la lecture
var dataBuffer = new ArrayBuffer(11);                   // données à écrire à chaque enregistrement (10 = date x6 + bpm + x + y + z)
var dataBufferView = new Int8Array(dataBuffer);         // permet de faire apparaitre le buffer comme un tableau de int et de le manipuler



// récuperer une ref aux élements de l'affichage
const background = document.getElementById("background");
const lbl_date = document.getElementById("lbl_date");
const lbl_hr = document.getElementById("lbl_hr");
const lbl_accel = document.getElementById("lbl_accel");



console.log(getFilesList().toString());

//deleteAllFiles();

//mainHugo();




function test(){

    // ouverture du flux
    fileDescriptor = fs.openSync("test", 'a+');

    var recordDate = new Date();

    // renseigner les données dans le buffer
    dataBufferView[0] = recordDate.getUTCDate();
    dataBufferView[1] = recordDate.getUTCMonth()+1;
    dataBufferView[2] = recordDate.getUTCFullYear().toString().substr(2, 2);
    dataBufferView[3] = recordDate.getUTCHours();
    dataBufferView[4] = recordDate.getUTCMinutes();
    dataBufferView[5] = recordDate.getUTCSeconds();
    dataBufferView[6] = recordDate.getUTCMilliseconds();
    dataBufferView[7] = 77;
    dataBufferView[8] = 5;
    dataBufferView[9] = 6;
    dataBufferView[10] = 7;

    // écriture  de l'enregistrement dans le fichier
    fs.writeSync(fileDescriptor, dataBuffer)
    fs.writeSync(fileDescriptor, dataBuffer)
    fs.writeSync(fileDescriptor, dataBuffer)

    // fermeture du flux
    fs.closeSync(fileDescriptor);

    outbox
    .enqueueFile("test")
    .then((ft) => {
        console.log(ft.name + " successfully queued.");
        ft.onchange = () => {
            console.log('File Transfer State: ' + ft.readyState);
            if (ft.readyState === 'transferred') {
                deleteFile(ft.name);
                console.log("Fichier supprimé !!!! ");
            }
        }
    })
    .catch((error) => {
        console.log("Failed to schedule transfer: " + error);
    })
}


function readOutboxQueue() {
    outbox.enumerate()
    .then(fileTransferArray => {
      console.log('Outbox Queue : length = ' + fileTransferArray.length + ' ; '+ Date.now());
      fileTransferArray.forEach(function(transfer) {
        console.log(`  ${transfer.name} : ${transfer.readyState}`);
      });
    });
}



function mainHugo(){
    // check import
    if (BodyPresenceSensor && HeartRateSensor && Accelerometer) {
        // check permissions
        if (appbit.permissions.granted("access_heart_rate")) {

            // instanciation des capteurs
            bodyPresenceSensor = new BodyPresenceSensor();
            heartRateSensor = new HeartRateSensor({ frequency: samplingFrequency });
            accelerometerSensor = new Accelerometer({ frequency: samplingFrequency });

            // chaque minutes on check si y'a des nouveaux fichiers à ajouter à la outbox
            clock.granularity = "minutes";  // seconds, minutes, or hours
            clock.addEventListener("tick", (evt) => {
                // récupérer la liste des fichiers à envoyer, tous sauf le courant
                let files = getFilesList();
                console.warn("Fichier sur la montre = " + files.toString());
                let date = new Date();
                let currentRecordFile = dateToFileName(date);
                files.splice(files.indexOf(currentRecordFile), 1);
                //console.warn("Fichier à envoyer = " + files.toString());
                // on ajoute chacun d'eux à la "outbox"
                for (const file of files) {
                    outbox
                        .enqueueFile("/private/data/" + file)
                        .then(ft => {
                            ft.onchange = () => {
                                if (ft.readyState === 'transferred') {
                                    console.log("[Outbox] " + ft.name + " transferé avec succès et supprimé !");
                                    deleteFile(ft.name);
                                }
                            }
                        })
                    .catch(err => {
                        console.log("/!\ Erreur lors de l'ajout du fichier" + file + " à la file d'attente...", err);
                    })
                }
               /*
                let date = new Date();
                date.setMinutes(date.getMinutes()-1);
                let currentRecordFile = dateToFileName(date);
                outbox
                .enqueueFile("/private/data/" + currentRecordFile)
                .then(ft => {
                    console.log("[Outbox] " + ft.name + " a été ajouté à la file d'attente avec succès.");
                })
                .catch(err => {
                    console.log("/!\ Erreur lors de l'ajout du fichier" + file + " à la file d'attente...", err);
                })
                console.warn("Liste des fichiers sur la montre : " + getFilesList().toString());
                */
            });
            
            //  chaque fois qu'une nouvelle valeur est dispo pour le capteur de présence (changement)
            bodyPresenceSensor.addEventListener("reading", () => {
                // on arrete ou on relance les autres capteurs
                if (bodyPresenceSensor.present) {
                    console.log("Présence détectée");
                    heartRateSensor.start();
                    accelerometerSensor.start();
                    background.style.fill = "black";
                } 
                else {
                    console.log("Présence perdue");
                    heartRateSensor.stop();
                    accelerometerSensor.stop();
                    background.style.fill = "red";
                }
            });

            // detection des erreurs -->  si le capteur de présence s'arrète c'est la merde car c'est lui qui arrete et relance les autres 
            bodyPresenceSensor.addEventListener("error", (err) => {
                console.error("/!\ Le capteur de présence s'est arrêté : ${err.code} - ${err.message}");
            });

            // chaque fois qu'une nouvelle valeur est dispo pour le capteur cardiaque (changement)
            heartRateSensor.addEventListener("reading", () => {

                // date et heure de la lecture des données
                let recordDate = new Date();
                let recordFile = dateToFileName(recordDate);
                // ouverture du flux
                fileDescriptor = fs.openSync(recordFile, 'a+');
                // renseigner les données dans le buffer
                dataBufferView[0] = recordDate.getUTCDate();
                dataBufferView[1] = recordDate.getUTCMonth();
                dataBufferView[2] = recordDate.getUTCFullYear().toString().substr(2, 2);
                dataBufferView[3] = recordDate.getUTCHours()+1;
                dataBufferView[4] = recordDate.getUTCMinutes();
                dataBufferView[5] = recordDate.getUTCSeconds();
                dataBufferView[6] = recordDate.getUTCMilliseconds();
                dataBufferView[7] = heartRateSensor.heartRate
                dataBufferView[8] = accelerometerSensor.x;
                dataBufferView[9] = accelerometerSensor.y;
                dataBufferView[10] = accelerometerSensor.z;
                // écriture  de l'enregistrement dans le fichier
                fs.writeSync(fileDescriptor, dataBuffer)
                // fermeture du flux
                fs.closeSync(fileDescriptor);
                // afficher les mesures sur l'écran
                displayRecord();
            });

            // lancement du capteur de présence
            bodyPresenceSensor.start();

        } 
        else {
            console.error("/!\ Erreur Permissions...");
        }
    } 
    else {
        console.error("/!\ Erreur Imports...");
    }
}














function displayRecord() {
    lbl_date.text = dataBufferView[3]+":"+dataBufferView[4]+":"+dataBufferView[5]+":"+dataBufferView[6];
    lbl_hr.text = "bpm = " + +dataBufferView[7];
    lbl_accel.text = "x="+dataBufferView[8]+" y="+dataBufferView[9]+" z="+dataBufferView[10];
}

function printRecordDescription () {
    //                          jour                    mois                année               heure                      min                  seconde             milliseconde            bpm                     x                       y                       z
    console.log("[Record] "+dataBufferView[0]+"/"+dataBufferView[1]+"/"+dataBufferView[2]+" "+dataBufferView[3]+":"+dataBufferView[4]+":"+dataBufferView[5]+":"+dataBufferView[6]+" bpm="+dataBufferView[7]+" x="+dataBufferView[8]+" y="+dataBufferView[9]+" z="+dataBufferView[10]);
}


function dateToFileName(dateObject) {
    return dateObject.toISOString().substr(0, 16).replace(/:/g, '_'); 
}




/*


var etatConnection = new Boolean(false);        // état de la connection montre <-> compagnon
var transfertEnCours = new Boolean(false);      // indique si la montre transfert des données vers l'appli compagnon

function changerEtatConnection (etat) {
    etatConnection = etat
    if(etatConnection) {
        console.log("Connection établie !");
    } else {
        console.log("Connection perdue...");
        if(transfertEnCours) {
            console.error("Un transfert de données était en cours, des données ont été perdues...")
        }
    }
}





function sendMessage() {
    // Sample data
    const data = {
      title: 'My test data',
      isTest: truess,
      records: [1, 2, 3, 4]
    }
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
      // Send the data to peer as a message
      console.log("envoie de données...");
      messaging.peerSocket.send(data);
    }
  }

  */


  /* 

// ouverture du flux
fileDescriptor = fs.openSync(recordsFile, 'a+');

//deleteAllFiles();

var dataBuffer = new ArrayBuffer(10)
var dataBufferView = new Int8Array(dataBuffer)


var myDate = new Date();

// renseigner les données dans le buffer
dataBufferView[0] = myDate.getUTCDate();
dataBufferView[1] = myDate.getUTCMonth()+1;
dataBufferView[2] = myDate.getUTCFullYear().toString().substr(2, 2);
dataBufferView[3] = myDate.getUTCHours()+1;
dataBufferView[4] = myDate.getUTCMinutes()+1;
dataBufferView[5] = myDate.getUTCSeconds()+1;
dataBufferView[6] = 60
dataBufferView[7] = 42;
dataBufferView[8] = 43;
dataBufferView[9] = 44;

// écriture dans le fichier
fs.writeSync(fileDescriptor, dataBuffer)

var result = new ArrayBuffer(10);
var resultView = new Int8Array(dataBuffer);

fs.readSync(fileDescriptor, result, 0, 10, 0);

console.log(resultView[0]+"/"+resultView[1]+"/"+resultView[2]+" "+resultView[3]+":"+resultView[4]+":"+resultView[5]+" bpm= "+resultView[6]+" x= "+resultView[7]+" y= "+resultView[8]+" z= "+resultView[9]);

// fermeture du flux
fs.closeSync(fileDescriptor)


*/




// check l'existence d'un fichier en indiquant son nom
function fileExist(fileName) {
    return fs.existsSync(fileName)
}

// renvoie la liste des fichiers du repertoire "/private/data"
function getFilesList() {
    let files = [];
    let dirIter;
    const listDir = fs.listDirSync("/private/data");
    while((dirIter = listDir.next()) && !dirIter.done) {
        files.push(dirIter.value);
    }
    return files;
}

// supprimer un fichier en indiquant son nom
function deleteFile(fileName){
    fs.unlinkSync(fileName);
}

// supprime tous les fichiers
function deleteAllFiles() {
    let i = 0;
    let files = getFilesList();
    files.forEach(function(item){
        i++;
        deleteFile(item);
    });
    console.log(i + " fichiers supprimés")
}

// affiche les détails d'un fichier en indiquant son nom
function printFileDetails(file) {
    let stats = fs.statSync(file);
    if (stats) {
      console.log("Taille : " + stats.size + " bytes");
      console.log("Dernière modification : " + stats.mtime);
    }
}

// réecrit le fichier 'parametersFile' et met à jour la date du dernier transfert
function updateLastTransfer() {
    let json_data = {
        "lastTransfert": Date.now(),
     };
    fs.writeFileSync(parametersFile, json_data, "json");
    console.log("Mise à jour date du dernier transfert : " + json_data.lastTransfert);    
}
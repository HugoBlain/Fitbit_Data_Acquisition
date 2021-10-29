from flask import *

app = Flask(__name__)
records = []

@app.route('/')
def description():
    return 'Records <ul>' + ''.join(
                                ['<li> ' + n for n in records]
                                ) + '</ul>\n', 200


@app.route('/record/deleteAll', methods=['DELETE'])
def deleteAll():
    records.clear()
    return "Tous les records ont été supprimés avec succès.\n", 201



@app.route('/record/<record>', methods=['PUT'])
def add (record):
    records.append(record)
    return "Record ajouté avec succès.\n", 201


app.run(host='0.0.0.0', debug=True)

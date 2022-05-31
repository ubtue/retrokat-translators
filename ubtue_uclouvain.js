{
	"translatorID": "516ad412-d9f3-48b6-ac66-404e117c5cfb",
	"label": "ubtue_uclouvain",
	"creator": "Timotheus Kim",
	"target": "^https?://(www\\.)?dial\\.uclouvain\\.be",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 80,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-05-31 12:17:25"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Universitätsbibliothek Tübingen All rights reserved.

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if (url.includes('/object/')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
 	var items = {};
 	var found = false;
 	var rows = doc.querySelectorAll('.title a');
 	for (let row of rows) {
 		let href = row.href;
 		let title = ZU.trimInternal(row.textContent);
 		if (!href || !title) continue;
 		if (checkOnly) return true;
 		found = true;
 		items[href] = title;
 	}
 	return found ? items : false;
 }
 
function doWeb(doc, url) {
 	if (detectWeb(doc, url) == "multiple") {
 		Zotero.selectItems(getSearchResults(doc, false), function (items) {
 			if (items) ZU.processDocuments(Object.keys(items), scrape);
 		});
 	}
 	else {
 		scrape(doc, url);
 	}
 }

function scrape(doc, url) {
	let json = JSON.parse(text(doc, 'script[type="application/ld+json"]').replace(/\n/g, " "));//Z.debug(json)
 	var translator = Zotero.loadTranslator('web');
 	// Embedded Metadata
 	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
 	// translator.setDocument(doc);
 	translator.setHandler('itemDone', function (obj, item) {
	if (json.pagination) item.pages = json.pagination;
	if (json.description) item.abstractNote = json.description;
	if (json.keywords) {
		for (let tag of json.keywords) {
		if (json && !tag.match(/^\d/)) item.tags.push({ tag });
		}
	}
	let parts = [];
	let newJSON = json.isPartOf;
	for (let i of [1,2,3,4]) {
		if (newJSON) {
			if (newJSON["@type"] == "PublicationIssue") {
				item.tags.push("##issueNumber##" + newJSON.issueNumber);
				item.tags.push("##datePublished##" + newJSON.datePublished);
			}
			if (newJSON["@type"] == "PublicationVolume") {
				item.tags.push("##volumeNumber##" + newJSON.volumeNumber);
			}
			if (newJSON["@type"] == "Periodical") {
				item.tags.push("##journalName##" + newJSON.name);
				item.tags.push("##issn##" + newJSON.issn);
			}
			newJSON = newJSON.isPartOf;
		}
	}
	if (json.url) item.tags.push("##handle##" + json.url);
	//ppn abfrage 
	item.complete();
 	});
	
 	translator.getTranslatorObject(function (trans) {
 		trans.itemType = "journalArticle";
 		trans.doWeb(doc, url);
 	});
 }
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://dial.uclouvain.be/pr/boreal/object/boreal:174097",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Analyse littéraire et exégèse biblique",
				"creators": [
					{
						"firstName": "Camille",
						"lastName": "Focant",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"ISSN": "0001-4133",
				"abstractNote": "Cet article rappelle d'abord quelques étapes importantes des relations difficiles entre histoire et fiction dans l'approche de la Bible du 19e siècle à nos jours; il situe la démarche de l'auteur dans le champ de l'exégèse biblique telle qu'elle se développe aujourd'hui. Une seconde partie est consacrée à un exemple pratique de ce que peut apporter la lecture de l'évangile de Marc comme une œuvre littéraire en examinant son code architectural.",
				"language": "en",
				"libraryCatalog": "dial.uclouvain.be",
				"pages": "47-64",
				"publicationTitle": "Bulletin de la Classe des Lettres et des Sciences morales et politiques",
				"url": "https://dial.uclouvain.be/pr/boreal/object/boreal:174097",
				"volume": "6",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "analyse littéraire"
					},
					{
						"tag": "exégèse biblique"
					}
				],
				"notes": [
					{
						"note": "doi:http://hdl.handle.net/2078.1/174097"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/

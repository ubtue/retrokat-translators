{
	"translatorID": "516ad412-d9f3-48b6-ac66-404e117c5cfb",
	"label": "uclouvain",
	"creator": "Timotheus Kim",
	"target": "^https?://(www\\.)?dial\\.uclouvain\\.be",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-10-12 16:06:47"
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
	let oai_url = url.replace('https://dial.uclouvain.be/pr/boreal/object/', 'https://dial.uclouvain.be/oai/?verb=GetRecord&metadataPrefix=marcxml&identifier=');
	ZU.doGet(oai_url, function (text) {
		var parser = new DOMParser();
		var xml = parser.parseFromString(text, "text/xml");
			var translator = Zotero.loadTranslator("import");
			translator.setTranslator("edd87d07-9194-42f8-b2ad-997c4c7deefd");
			translator.setString(text);
			translator.setHandler("itemDone", function (obj, item) {
				let newNotes = [];
				for (let note of item.notes) {
					newNotes.push('abs:' + note['note']);
				}
				item.notes = newNotes;
				if (item.place) {
					item.notes.push('place::' + item.place);
					item.notes.push('publisher::' + item.publisher)
				}
				item.itemType = "journalArticle";
				for (let url of ZU.xpath(xml, '//*[@tag="856"]/*[@code="u"]')) {
					if (url.textContent.match('/2078.1/')) {
						item.url = url.textContent;
						break;
					}
				}
				item.notes.push('LF:');
				let identifier =  ZU.xpathText(xml, '//*[@tag="001"]');
				item.notes.push('hdl:' + identifier.replace('boreal:', '2078.1'));
				//add_marc_field_024 = "0247 \037a%hdl%\0372hdl
				for (let identifier of ZU.xpath(xml, '//*[@tag="022"]')) {
					if (ZU.xpathText(identifier, './*[@code="v"]') == 'e-issn') {
						item.notes.push('issn:' + issn);
						break;
					}
				}
				if (!item.volume && !item.issue && !item.pages) {
					if (ZU.xpathText(xml, '//*[@tag="779"]/*[@code="g"]')) {
						item.notes.push('773$g:' + ZU.xpathText(xml, '//*[@tag="779"]/*[@code="g"]'));
					}
				}
				//hinzufügen: 4241-Daten (hier ISSN);
				//264-Daten (beide Felder)
				//orcid
				//Daten aus 779 verwenden.

				item.complete();
			});
			translator.translate();
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

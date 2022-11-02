{
	"translatorID": "27eb31b6-8878-403f-994f-cb086544f89c",
	"label": "ubtue_vitaepensiero",
	"creator": "Helena Nebel",
	"target": "https://www.vitaepensiero.it/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-11-02 17:59:39"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Universitätsbibliothek Tübingen.  All rights reserved.
	Modified 2021 by Timotheus Kim
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

var pages = {};

function detectWeb(doc, url) {
	if (url.match(/\/scheda-articolo_digital\//)) {
		return "journalArticle";
	} else if (url.match(/\/scheda-fascicolo_contenitore_digital\//) && getSearchResults(doc)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[@class="capitoloContent"]');
	for (let i = 0; i < rows.length; i++) {
		//Z.debug(ZU.xpath(rows[i], './/a').innerHTML);
		let href = ZU.xpath(rows[i], './/a')[0].href;
		let title = ZU.trimInternal(ZU.xpath(rows[i], './/a')[0].textContent);
		if (!href || !title || title=="Abstract ∨") continue;
		pages[href] = ZU.xpathText(rows[i], './/span[@class="totPagine"]/strong');
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function invokeEmbeddedMetadataTranslator(doc, url) {
	let translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, item) {
		item.itemType = 'journalArticle';
		item.attachments = [];
		item.title = ZU.xpathText(doc, '//h1[@itemprop="name"]').replace('\n', ' ');
		let authors = ZU.xpath(doc, '//a[@itemprop="author"]');
		item.creators = [];
		for (let author of authors) {
			item.creators.push(ZU.cleanAuthor(author.textContent.replace(/prof\b|dr\b/gi, ''), "authors"));
		}
			
		let itemAbstract = doc.querySelector('#base_0_area1main_0_aZusammenfassung');
		if(itemAbstract) item.abstractNote = itemAbstract.textContent;
		if (item.abstractNote != null) {
			item.abstractNote = item.abstractNote.replace(/(?:Zusammenfassung\s*\/\s*(?:Summary|Abstract)(?:\n\s*)*)|\n/g, "");
		}
		let fasc = ZU.xpath(doc, '//tr[@valign="top"]')
		for (let f of fasc) {
			if (ZU.xpathText(f, './td[@class="cell_1" and (contains(., "fascicolo") or contains(., "Fascicolo"))]')) {
				let fascicolo = ZU.xpathText(f, './td[@class="cell_2"]');
				
				if (fascicolo.match(/^.+\s+-\s+\d{4}\s+-\s+\d+$/) != null) {
					item.issue = fascicolo.match(/\s+-\s+\d{4}\s+-\s+(\d+)$/)[1];
					item.volume = fascicolo.match(/\s+-\s+(\d{4})\s+-\s+\d+$/)[1];
					item.date = item.volume;
					item.volume = "";
					item.publicationTitle = fascicolo.match(/^(.+)\s+-\s+\d{4}\s+-\s+\d+$/)[1];
				}
				
			}
			else if (ZU.xpathText(f, './td[@class="cell_1" and (contains(., "doi") or contains(., "Doi"))]')) {
				let doi = ZU.xpathText(f, './td[@class="cell_2"]');
				item.DOI = doi;
				
			}
			
			
		}
		
		if (item.publicationTitle == "RIVISTA DI STORIA DELLA CHIESA IN ITALIA") {
			item.ISSN = "1827-790X";
		}
		item.abstractNote = ZU.xpathText(doc, '//span[@itemprop="description"]');
		item.tags = [];
		let tags = ZU.xpathText(doc, '//div[contains(@class, "infoAggiuntive") and contains(@class, "noBackground")]');
		if (tags != null) {
			tags = tags.replace(/\n|keywords/g, '').trim();
			item.tags = tags.split(' – ');
		}
		if (item.title == "Recensioni") item.tags.push("RezensionstagPica");
		if (pages[item.url] != undefined) {
			item.pages = pages[item.url]
		}
		item.complete();
	});
	translator.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			let articles = [];
			for (let i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEmbeddedMetadataTranslator);
		});
	} else invokeEmbeddedMetadataTranslator(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.vitaepensiero.it/scheda-articolo_digital/mario-iadanza/tra-occidente-e-oriente-la-chiesa-di-benevento-del-vescovoemilio-agli-inizi-del-v-secolo-001783_20211_0002_0357-371438.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Tra Occidente e Oriente. La Chiesa di Benevento del vescovo\nEmilio agli inizi del V secolo",
				"creators": [
					{
						"firstName": "Mario",
						"lastName": "Iadanza",
						"creatorType": "authors"
					}
				],
				"date": "2021",
				"DOI": "10.26350/001783_000104",
				"ISSN": "1827-790X",
				"abstractNote": "Our text focuses on Aemilius, bishop of Beneventum at the beginning of the fifth century. Unfortunately, Aemilius’ figure, though of undisputed value – related to both prominent personalities of the ecclesial world between Campania  and Apulia and illustrious families belonging to the Roman Christian aristocracy – suffers from a lack of sources. Our paper is divided into three sections. Section one, exploring Aemilius’ own network of contacts and social relationships, is based upon the analysis of Paolinus of Nola’s Carm. XXV and XXI. Section two, taking the cue from Palladius’ records, pieces together different phases of the legation sent to Constantinople by Emperor Honorius and  Pope Innocent I (405-406?) during John Chrysostom’s dramatic deposition and exile, as well as the role played by Aemilius at that time. Finally, section three examines pastoral actions and church building projects promoted by the  bishop in Beneventum, hypothetically ascribing to him the construction of the domus episcopalis.",
				"issue": "2",
				"language": "it",
				"libraryCatalog": "www.vitaepensiero.it",
				"publicationTitle": "RIVISTA DI STORIA DELLA CHIESA IN ITALIA",
				"url": "https://www.vitaepensiero.it/scheda-articolo_digital/mario-iadanza/tra-occidente-e-oriente-la-chiesa-di-benevento-del-vescovoemilio-agli-inizi-del-v-secolo-001783_20211_0002_0357-371438.html",
				"volume": "2021",
				"attachments": [],
				"tags": [
					{
						"tag": "Aemilius"
					},
					{
						"tag": "Beneventum"
					},
					{
						"tag": "Bishop"
					},
					{
						"tag": "John Chrysostom"
					},
					{
						"tag": "Paolinus of Nola"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.vitaepensiero.it/scheda-articolo_digital/daniele-santarelli-domizia-weber/stereotipi-e-anomalie-nella-cacciaalle-streghe-in-eta-moderna-alla-ricerca-di-un-modello-prosopografico-001783_2021_0002_0521-371443.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Stereotipi e anomalie nella caccia\nalle streghe in età moderna. Alla ricerca di un modello prosopografico",
				"creators": [
					{
						"firstName": "Daniele",
						"lastName": "Santarelli",
						"creatorType": "authors"
					},
					{
						"firstName": "Domizia",
						"lastName": "Weber",
						"creatorType": "authors"
					}
				],
				"date": "2021",
				"DOI": "10.26350/001783_000109",
				"ISSN": "1827-790X",
				"abstractNote": "This paper highlights how, in the early modern age, social and cultural categories usually related to individuals charged with witchcraft are prone to distinctive variables. Our contribute will deal with some meaningful cases that took  place in Central-North Italy between the XVI and XVII centuries, whilst comparing stereotypes frequently linked to witches by specific literature to documentary facts. As such stereotypes are not always matched by records, we  proposed to analyze the dialectic between stereotypes and anomalies in early modern witchlore, turning to prosopographical models and IT tools.",
				"issue": "2",
				"language": "it",
				"libraryCatalog": "www.vitaepensiero.it",
				"publicationTitle": "RIVISTA DI STORIA DELLA CHIESA IN ITALIA",
				"url": "https://www.vitaepensiero.it/scheda-articolo_digital/daniele-santarelli-domizia-weber/stereotipi-e-anomalie-nella-cacciaalle-streghe-in-eta-moderna-alla-ricerca-di-un-modello-prosopografico-001783_2021_0002_0521-371443.html",
				"volume": "2021",
				"attachments": [],
				"tags": [
					{
						"tag": "Digital Humanities"
					},
					{
						"tag": "Prosopography"
					},
					{
						"tag": "Stereotypes"
					},
					{
						"tag": "Witchcraft"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.vitaepensiero.it/scheda-fascicolo_contenitore_digital/autori-vari/rivista-di-storia-della-chiesa-in-italia-2021-2-001783_2021_0002-371437.html",
		"items": "multiple"
	}
]
/** END TEST CASES **/

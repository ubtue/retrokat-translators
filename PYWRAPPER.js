{
	"translatorID": "13ea69e1-c07c-4673-9f40-816011e3d10z",
	"label": "PYWRAPPER",
	"creator": "",
	"target": ".*pywrapper.*",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-03-11 17:30:10"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 YOUR_NAME <- TODO
	
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
	if (url.includes("pywrapper.py") && url.includes("feed")) {
		return "multiple";
	}
	if (url.includes("pywrapper.py")) {
		return "journalArticle";
	}
	return false;
}


function doWeb(doc, url) {
	
	scrape(doc, url);
}


function scrape(doc, url) {
	let spans = doc.getElementsByTagName("span");
	if (spans.length != 1) {
	   Z.debug("ERROR: Invalid length: " + spans.length);
	   return false;
	}
	bibtexText = spans.item(0).textContent;
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
	translator.setString(bibtexText);
	translator.setHandler("itemDone", function (obj, item) {
		for (let note of item.notes) {
			note['note'] = note['note'].replace(/<\/?.+?>/g, '');
		}
		let newTags = [];
		if (item.tags.includes("Book") && (item.tags.includes("Review") || item.tags.includes("Reviews"))) {
			item.tags = ["Book Review"];
		}
		for (let tag of item.tags) {
			tag = tag.replace(/\?\?\?\?/g, ",");
			tag = tag.replace(/xxxx/g, "--");
			newTags.push(tag);
		}
		item.tags = newTags;
		item.complete();
	});
	translator.translate();
}

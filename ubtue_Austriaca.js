{
	"translatorID": "5f4873d0-034c-43ec-95b0-803e5c669bb5",
	"label": "ubtue_Austriaca",
	"creator": "Timotheus Kim",
	"target": "austriaca.at",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 95,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-03-07 13:56:15"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.

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

var reviewURLs = [];

function detectWeb(doc, url) {
	if (url.includes('?arp=')) return "journalArticle";
	else if (url.match(/inhalt/) && getSearchResults(doc)) return "multiple";
	else return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		found = true;
		if (href.match(/\?arp=/) != null) items[href] = title;
	}
	let reviewSection = ZU.xpath(doc, '//div[contains(@class, "issueSubjectGroup")][./h3[@class="issueSubjectGroupHeading"]="II. ABTEILUNG"]');
	if (reviewSection.length == 0) {
		reviewSection = ZU.xpath(doc, '//div[contains(@class, "issueSubjectGroup")][./h3[@class="issueSubjectGroupHeading"]="II. Abteilung"]');
	}
	var reviewRows = ZU.xpath(reviewSection, './/div[@class="issueArticle"]//a[contains(@class, "issueContentsArticleLink")]');
	for (let row of reviewRows) {
		let href = row.href.match(/document/).input;
		reviewURLs.push(href);
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEMTranslator);
		});
	} else {
		invokeEMTranslator(doc, url);
	}
}

function invokeEMTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		if (detectWeb(doc, url) == "journalArticle") {
			i.itemType = "journalArticle";
		}
		if (i.title.match(/ISBN/)) i.tags.push('Book Review') && delete i.abstractNote;
		if (i.abstractNote) {
			i.abstractNote += ZU.xpathText(doc, '//*[(@id = "transAbstract")]//p');
			if (i.abstractNote.match(/Der Artikel .* wurde .* in der Zeitschrift .* veröffentlicht\.null$/) !== null) {
				i.abstractNote = '';
			}
		}
		if (i.abstractNote != null) i.abstractNote = i.abstractNote.replace('\.null', '.');
		if (i.ISSN == "1868-9027") {
			if (reviewURLs.includes(i.url)) {
			i.tags.push('Book Review');
		}
		}
		if (ZU.xpathText(doc, '//span[@class="accessOpenAccess mr-2"]') != null) {
			if (ZU.xpathText(doc, '//span[@class="accessOpenAccess mr-2"]').match(/Open Access/i)) {
				i.notes.push('LF:');
			}
		}
		let orcidTag = ZU.xpath(doc, '//span[@class="metadataAndContributorsFont"]');
		if (orcidTag.length != 0) {
		//Z.debug(orcidTag[0].innerHTML);
		orcidMatches = orcidTag[0].innerHTML.match(/<span class="contributor"[^>]+>([^<]+)<\/span>\s+<span class="orcidLink"[^>]+><a href="https:\/\/orcid\.org\/([^"]+)"/gi);
		for (let o in orcidMatches) {
			let authorTag = orcidMatches[o].match(/<span class="contributor"[^>]+>([^<]+)<\/span>\s+<span class="orcidLink"[^>]+><a href="https:\/\/orcid\.org\/([^"]+)"/i);
			if (authorTag[2] != undefined) {
				let author = authorTag[1];
				let orcid = authorTag[2];
				i.notes.push({note: "orcid:" + orcid + ' | ' + author});
			}
			
		}
		}
		if (i.tags[0] != undefined) {
			if (i.tags[0] == "journals" || i.tags.length == 0) {
				i.tags = [];
			}
		}
		if (ZU.xpathText(doc, '//div[contains(., "Keywords:")]')!= null) {
			KeywordString = ZU.xpathText(doc, '//div[contains(., "Keywords:")]').match(/Keywords:\n(.+?).?Published Online/)[1];
			for (let keyWordSplitter of [", ", "; ", " - "]) {
				if (KeywordString.split(keyWordSplitter).length > 2) {
				for (let keyWord of KeywordString.split(keyWordSplitter)) {
					i.tags.push(keyWord);
			}
			break;
			}
			}
		}
		if (i.abstractNote != null || i.abstractNote != undefined) {
			if (i.abstractNote.match(/(^Aus\s+dem\s+Inhalt:\s+)|(^Inhalt:(null)?)|(^Inhaltsverzeichnis:)/) != null) {
				i.abstractNote = "";
			}
		}
		let hexCodes = ["&#x2013;", "&#x2018;", "&#x2019;", "&#x26;"];
		let hexCodeToChar = {"&#x2013;":"–", "&#x2018;": "‘", "&#x2019;": "’", "&#x26;": "&"};
		for (let hexCode of hexCodes) {
			i.title = i.title.replace(hexCode, hexCodeToChar[hexCode]);
		}
		let newCreators = [];
		for (let creator of i.creators) {
			
		}
		for (let cleanCreator of ZU.xpath(doc, '//b[@class="author"]')) {
			cleanCreator = ZU.cleanAuthor(cleanCreator.textContent.replace(/,\s*$/, ""));
			if (cleanCreator.lastName != "BIETAK (Hg.)") newCreators.push(cleanCreator);
		}
		i.creators = newCreators;
		i.title = i.title.replace(/<\/?.+?>/g, "");
		i.attachments = [];
		i.complete();
	});
	translator.translate();
}

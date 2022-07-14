{
	"translatorID": "c94d058e-5ea9-40ec-aee6-0488a48cbcc6",
	"label": "ubtue_DigiZeitschriften",
	"creator": "Philipp Zumstein",
	"target": "^https?://www\\.digizeitschriften\\.de/((en/)?dms/|index\\.php\\?id=27[24])",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 95,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-07-14 12:20:16"
}

/*
	***** BEGIN LICENSE BLOCK *****

	DigiZeitschriften Translator, Copyright © 2014 Philipp Zumstein
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

var realTitles = {};

function detectWeb(doc, url) {
	if (url.indexOf("/img/") != -1 || url.indexOf("index.php?id=274") != -1 ) {//e.g. http://www.digizeitschriften.de/index.php?id=274&PPN=PPN342672002_0020&DMDID=dmdlog84&L=2
		return "journalArticle";
	} 
	else if ( (url.indexOf("/toc/") != -1 || url.indexOf("index.php?id=272")) && getSearchResults(doc).length>0) {
		return "multiple";
	}
}


function getSearchResults(doc) {
	/*<div class="goobit3-toc-item goobit3-toc-item--indent-60 goobit3-toc-item--tx-goobit3-toc_toc">
<a href="dms/img/?PID=PPN507831411_1935_0016%7Clog15" class="goobit3-toc-item__site-title">Norström, Vitalis: Religion und Gedanke</a>Kurt Leese<span class="goobit3-toc-item__page-number"><a href="dms/img/?PID=PPN507831411_1935_0016%7Clog15">95</a><a href="http://www.digizeitschriften.de/download/PPN507831411_1935_0016/PPN507831411_1935_0016___log15.pdf" class="goobit3-toc-item__link goobit3-toc-item__link--pdf" title="PDF"><span class="sr-only">PDF</span></a></span>
</div>*/
	for (let tag of ZU.xpath(doc, '//div[contains(@class, "goobit3-toc-item goobit3-toc-item--indent")]')) {
		let link = ZU.xpathText(tag, './a[@class="goobit3-toc-item__site-title"]/@href');
		let realPub = tag.innerHTML.match(/>([^<]+)<\/a>([^<]+)/);
		if (realPub != null) {
			realTitles[link] = realPub[2] + '###' + realPub[1]
		}
	} 
	return ZU.xpath(doc, '//div/a[contains(@class, "goobit3-toc-item__site-title")]');
}


function doWeb(doc, url) {
	var articles = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = {};
		var titles = getSearchResults(doc);
		for (var i=0; i<titles.length; i++) {
			items[titles[i].href] = titles[i].textContent;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}


function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');

	translator.setHandler('itemDone', function (obj, item) {
		if (ZU.xpathText(doc, '//meta[@name="citation_author"]') == null) {
			item.creators = [];
		}
		var metadataUrl = ZU.xpathText(doc, '//ul[contains(@class, "subnav")]/li[2]/a/@href');
		//fix relative urls which don't start with a backslash
		if (metadataUrl.indexOf('http') != 0 && metadataUrl[0] != "/") {
			metadataUrl = "/" + metadataUrl;
		}
		//redirect metadata lookup such that labels are always German 
		metadataUrl = metadataUrl.replace('/en/', '/');
		//Z.debug(metadataUrl);
		ZU.doGet(metadataUrl, function(text) {
			//additional data from metadata side
			item.publisher = extractField("Verlag", text );
			item.place = extractField("Erscheinungsort", text );
			item.ISSN = extractField("ISSN", text );
			if (url.indexOf("/img/") != -1 || url.indexOf("index.php?id=274") != -1 ) {//e.g. http://www.digizeitschriften.de/index.php?id=274&PPN=PPN342672002_0020&DMDID=dmdlog84&L=2
				var title = ZU.xpathText(doc, '//div[contains(@class, "goobit3-image__title")]');
				item.itemType = "journalArticle";
			}
			//finalize
			item.title = ZU.xpathText(doc, '//div[contains(@class, "goobit3-image__title")]');
			item.libraryCatalog = "DigiZeitschriften";
			item.url = url;
			if (item.volume == undefined) {
				if (item.url.match("_.+?%7Clog") != null) {
					let volume = item.url.match("_([^_]+)%7Clog");
					item.volume = volume[1].replace(/^0*/, "");
				}
			}
			if (item.date == undefined) {
				if (ZU.xpathText(doc, '//a[contains(., "Zeitschriftenband")]') != null) {
				item.date = ZU.xpathText(doc, '//a[contains(., "Zeitschriftenband")]').match(/\d{4}/)[0];
			}
			}
			item.tags = [];
			delete item.abstractNote;
			item.attachments = [];
			item.notes.push('LF:');
			if (ZU.xpathText(doc, '//span[@class="goobit3-image__struct"]') != null) {
			if (ZU.xpathText(doc, '//span[@class="goobit3-image__struct"]').match(/Rezension/)) {
				if (item.title == "") {
				item.title = 'Rezension';
					}
				item.tags.push('Book Review');
				}
			}
			if (item.pages == undefined) {
				if (ZU.xpathText(doc, '//span[contains(@class,"goobit3-image__struct")][3]') != null) {
					let span = ZU.xpathText(doc, '//span[contains(@class,"goobit3-image__struct")][3]');
					if (span.match(/[^(]\d+\s*(?:-\s*\d+)?[^)]/) != null) {
						item.pages = span.match(/[^(]\d+\s*(?:-\s*\d+)?[^)]/)[0].replace(/\s+/g, "");
					}
				}
			}
			
			if (item.pages == undefined) {
				if (ZU.xpathText(doc, '//span[contains(@class,"goobit3-image__struct")][5]') != null) {
					let span = ZU.xpathText(doc, '//span[contains(@class,"goobit3-image__struct")][5]');
					if (span.match(/[^(]\d+\s*(?:-\s*\d+)?[^)]/) != null) {
						item.pages = span.match(/[^(]\d+\s*(?:-\s*\d+)?[^)]/)[0].replace(/\s+/g, "");
					}
				}
			}
			
			if (item.pages == undefined) {
				if (ZU.xpathText(doc, '//span[contains(@class,"goobit3-image__struct")][4]') != null) {
					let span = ZU.xpathText(doc, '//span[contains(@class,"goobit3-image__struct")][4]');
					if (span.match(/[^(]\d+\s*(?:-\s*\d+)?[^)]/) != null) {
						item.pages = span.match(/[^(]\d+\s*(?:-\s*\d+)?[^)]/)[0].replace(/\s+/g, "");
					}
				}
			}
			
			if (item.pages == undefined) {
				if (ZU.xpathText(doc, '//span[contains(@class,"goobit3-image__struct")]') != null) {
					let span = ZU.xpathText(doc, '//span[contains(@class,"goobit3-image__struct")]');
					if (span.match(/\/\s+(I+(?:\s*-\s*[IV]+)?)$/) != null) {
						item.pages = span.match(/\/\s+(I+(?:\s*-\s*[IV]+)?)$/)[1].replace(/\s+/g, "");
					}
				}
			}
			
			let searchURL = item.url.replace("http://www.digizeitschriften.de/", "");
			realPub = realTitles[searchURL];
			if (realPub != undefined) {
				let realTitle = realPub.split('###')[1];
				let realAuthor = realPub.split('###')[0];
				if (item.title.substring(0,12) != realTitle.substring(0,12)) {
					item.title = realTitle.replace(/...$/, "");
					item.creators = [ZU.cleanAuthor(realAuthor, 'author')];
				}
				if (item.creators.length == 0) {
					item.creators = [ZU.cleanAuthor(realAuthor, 'author')];
				}
			}
			
			if (item.title.match(/DigiZeitschriften:\s+/) == null) {
				if (title != "Zeitschriftenheft") {
					if (item.title != "" && item.title != undefined) {
						item.complete();
					}
					
				}
			}
		});
		
		
	});
	
	translator.getTranslatorObject(function(trans) {
		trans.doWeb(doc, url);
	});
}


function extractField(fieldName, text) {
	//extracts the value of the field with the name 'fieldName'
	//in the text 'text' and returns it
	var expression = new RegExp('<span[^>]*>\\s*'+fieldName+":?\\s*</span>\\s*<span>([^<]*)</span>");
	var extraction = text.match(expression);
	if (extraction) {
		return extraction[1];
	} else {
		return false;
	}
}







/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.digizeitschriften.de/dms/img/?PPN=PPN356261603_0054&DMDID=dmdlog15",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Quadratische Identitäten bei Polygonen.",
				"creators": [
					{
						"firstName": "Wolfgang",
						"lastName": "Schuster",
						"creatorType": "author"
					}
				],
				"date": "1997",
				"ISSN": "0001-9054",
				"language": "de",
				"libraryCatalog": "DigiZeitschriften",
				"pages": "117-143",
				"publicationTitle": "Aequationes Mathematicae",
				"url": "http://www.digizeitschriften.de/dms/img/?PPN=PPN356261603_0054&DMDID=dmdlog15",
				"volume": "54",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.digizeitschriften.de/en/dms/img/?PPN=GDZPPN002612097",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Quadratische Identitäten bei Polygonen.",
				"creators": [
					{
						"firstName": "Wolfgang",
						"lastName": "Schuster",
						"creatorType": "author"
					}
				],
				"date": "1997",
				"ISSN": "0001-9054",
				"language": "de",
				"libraryCatalog": "DigiZeitschriften",
				"pages": "117-143",
				"publicationTitle": "Aequationes Mathematicae",
				"url": "http://www.digizeitschriften.de/en/dms/img/?PPN=GDZPPN002612097",
				"volume": "54",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.digizeitschriften.de/dms/img/?PPN=PPN379931524_0002&DMDID=dmdlog10",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Die Soundness des Prädikatenkalküls auf der Basis der Quineschen Regeln.",
				"creators": [
					{
						"firstName": "Hans",
						"lastName": "Hermes",
						"creatorType": "author"
					},
					{
						"firstName": "Heinz",
						"lastName": "Gumin",
						"creatorType": "author"
					}
				],
				"ISSN": "0003-9268",
				"language": "de",
				"libraryCatalog": "DigiZeitschriften",
				"pages": "68-77",
				"publicationTitle": "Archiv für mathematische Logik und Grundlagenforschung",
				"url": "http://www.digizeitschriften.de/dms/img/?PPN=PPN379931524_0002&DMDID=dmdlog10",
				"volume": "2",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.digizeitschriften.de/dms/img/?PPN=GDZPPN002612097",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Quadratische Identitäten bei Polygonen.",
				"creators": [
					{
						"firstName": "Wolfgang",
						"lastName": "Schuster",
						"creatorType": "author"
					}
				],
				"date": "1997",
				"ISSN": "0001-9054",
				"language": "de",
				"libraryCatalog": "DigiZeitschriften",
				"pages": "117-143",
				"publicationTitle": "Aequationes Mathematicae",
				"url": "http://www.digizeitschriften.de/dms/img/?PPN=GDZPPN002612097",
				"volume": "54",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.digizeitschriften.de/dms/toc/?PPN=GDZPPN002612089",
		"items": "multiple"
	}
]
/** END TEST CASES **/

{
	"translatorID": "505a5d08-50b1-4c59-804c-a01b46d15d73",
	"label": "ubtue_libraWeb",
	"creator": "Simon Kornblith",
	"target": "http:\\/\\/www.libraweb.net/articoli",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 95,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-12-30 16:08:32"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Simon Kornblith

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

// The variables items and selectArray will be filled during the first
// as well as the second retrieveDOIs function call and therefore they
// are defined global.


var replaceChars = {"Â¡": "¡", "Â¢": "¢", "Â£": "£", "Â¤": "¤", "Â¥": "¥", "Â¦": "¦", "Â§": "§", "Â¨": "¨", "Â©": "©", "Âª": "ª", "Â«": "«", "Â¬": "¬", "Â®": "®", "Â¯": "¯", "Â°": "°", "Â±": "±", "Â²": "²", "Â³": "³", "Â´": "´", "Âµ": "µ", "Â¶": "¶", "Â·": "·", "Â¸": "¸", "Â¹": "¹", "Âº": "º", "Â»": "»", "Â¼": "¼", "Â½": "½", "Â¾": "¾", "Â¿": "¿", "Ã€": "À", "Ã": "Á", "Ã‚": "Â", "Ãƒ": "Ã", "Ã„": "Ä", "Ã…": "Å", "Ã†": "Æ", "Ã‡": "Ç", "Ãˆ": "È", "Ã‰": "É", "ÃŠ": "Ê", "Ã‹": "Ë", "ÃŒ": "Ì", "Ã": "Í", "ÃŽ": "Î", "Ã": "Ï", "Ã": "Ð", "Ã‘": "Ñ", "Ã’": "Ò", "Ã“": "Ó", "Ã”": "Ô", "Ã•": "Õ", "Ã–": "Ö", "Ã—": "×", "Ã˜": "Ø", "Ã™": "Ù", "Ãš": "Ú", "Ã›": "Û", "Ãœ": "Ü", "Ã": "Ý", "Ãž": "Þ", "ÃŸ": "ß", "Ã¡": "á", "Ã¢": "â", "Ã£": "ã", "Ã¤": "ä", "Ã¥": "å", "Ã¦": "æ", "Ã§": "ç", "Ã¨": "è", "Ã©": "é", "Ãª": "ê", "Ã«": "ë", "Ã¬": "ì", "Ã­": "í", "Ã®": "î", "Ã¯": "ï", "Ã°": "ð", "Ã±": "ñ", "Ã²": "ò", "Ã³": "ó", "Ã´": "ô", "Ãµ": "õ", "Ã¶": "ö", "Ã·": "÷", "Ã¸": "ø", "Ã¹": "ù", "Ãº": "ú", "Ã»": "û", "Ã¼": "ü", "Ã½": "ý", "Ã¾": "þ", "Ã¿": "ÿ", "Ã": "à"};

var articleInfo = {};
var volume = "";
var issue = "";
var year = "";
var issn = "";

function detectWeb(doc, url) {
	if (getSearchResults(doc, url, true)) {
		return "multiple";
	}
}

function getSearchResults(doc, url, checkOnly) {
	var items = {};
	var found = false;
	let html = doc.body.innerHTML;
	html = html.replace(/\n/g, "");
	let volumeInformation = html.match(/<a href="sommari\.php\?chiave=\d+">(.+?)</);
	if (volumeInformation != null) {
		volumeInformationString = volumeInformation[1];
		volumeMatch = volumeInformationString.match(/Volume\s+(\d+)/);
		if (volumeMatch != null) volume = volumeMatch[1];
		yearMatch = volumeInformationString.match(/(\d{4}),\s+/);
		if (yearMatch != null) year = yearMatch[1];
		issueMatch = volumeInformationString.match(/\d+,\s+([IV])/);
		if (issueMatch != null) issue = issueMatch[1];
	}
	Z.debug(url);
	if (url.match(/rivista=70$/) != null) {
		issn = "19724934";
	}
	let articles = html.match(/<span class="asterisco">.+?<span class="libra-book-buy libra-book-buy-left">.+?<\/i>/g);
	articles = articles.splice(1, articles.length);
	for (let article of articles) {
		let articleTitle = article.match(/<span class="font-xl">.*?<br>(.+?)<\/span>/);
		if (articleTitle != null) {
			var title = articleTitle[1].replace(/<\/?[iI]>/g, '');
			var id = article.match(/<a\s+id="(\d+)">/);
			if (id != null) {
				var href = url.replace(".php", "3.php") + "&articolo=" + id[1];
				found = true;
				items[href] = title;
				articleInfo[href] = article;
			}
		}
	}
	return found ? items : false;
	
	
}

function doWeb(doc, url) {
		Zotero.selectItems(getSearchResults(doc, url, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
}

function scrape(doc, url) {
	article = articleInfo[url];
	const DOIre = /\b10\.[0-9]{4,}\/[^\s&"']*[^\s&"'.,]/g;
	let articleDOI = article.match(DOIre);
	if (articleDOI != null) {
		articleDOI = articleDOI[0];
		const translate = Zotero.loadTranslator("search");
		translate.setTranslator("b28d0d42-8549-4c6d-83fc-8382874a5cb9");
	
		translate.setSearch({ itemType: "journalArticle", DOI: articleDOI });
		translate.setHandler("itemDone", function (_translate, item) {
			Z.debug(article);
			let pagination = article.match(/Pagine:\s?(\d+(?:-\d+)?)[^\d]/);
				if (pagination != null) {
					item["pages"] = pagination[1];
				}
				for (let creator of item.creators) {
				for (let replaceChar in replaceChars) {
					item["title"] = item["title"].replace(replaceChar, replaceChars[replaceChar]);
						creator.lastName = creator.lastName.replace(replaceChar, replaceChars[replaceChar]);
						creator.firstName = creator.firstName.replace(replaceChar, replaceChars[replaceChar]);
					}
					let dateOfBirth = creator.firstName.match(/,\s+\d{4}-/);
					if (dateOfBirth != null) {
						creator.firstName = creator.firstName.substring(0, dateOfBirth.index);
					}
				}
			item.issue = issue;
			item.volume = volume;
			item.date = year;
			item.complete();
		});
		translate.setHandler("error", function () {});
	
		translate.translate();
	}
	else {
		let item = new Zotero.Item("journalArticle");
		let articleTitle = article.match(/<span class="font-xl">(.*?)<br>(.+?)<\/span>/);
		if (articleTitle != null) {
			item.title = articleTitle[2].replace(/<\/?[iI]>/g, '');
			let creatorString = articleTitle[1];
			item.creators.push(ZU.cleanAuthor(creatorString, "author"));
			}
			let pagination = article.match(/Pagine:\s?(\d+(?:-\d+)?)[^\d]/);
				if (pagination != null) {
					item["pages"] = pagination[1];
				}
			item.url = url;
			item.issue = issue;
			item.volume = volume;
			item.date = year;
			item.ISSN = issn;
		item.complete();
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://blog.apastyle.org/apastyle/digital-object-identifier-doi/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://libguides.csuchico.edu/citingbusiness",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.egms.de/static/de/journals/mbi/2015-15/mbi000336.shtml",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.roboticsproceedings.org/rss09/p23.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://en.wikipedia.org/wiki/Template_talk:Doi",
		"items": "multiple"
	}
]
/** END TEST CASES **/

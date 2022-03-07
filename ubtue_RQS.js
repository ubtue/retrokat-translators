{
	"translatorID": "e6216151-ce62-49cd-97ed-aaee56b533ac",
	"label": "ubtue_RQS",
	"creator": "Helena Nebel",
	"target": "rqs.be\\/app\\/views\\/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 95,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-03-07 11:29:45"
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
	let volumeInformation = html.match(/<div class="w3-col m2 w3-section">.+?<span class="w3-xlarge">(.+?)<\/span><br>.+?<\/div>/g);
	for (let infoTag of volumeInformation) {
		let info = infoTag.match(/<div class="w3-col m2 w3-section">.+?<span class="w3-xlarge">(.+?)<\/span><br>\s+(.+?)\s+?<\/div>/);
		if (info != null) {
		if (info[2] == "Année") {
			year = info[1];
			}
		if (info[2] == "Tome") {
		volume = info[1];
		}
		if (info[2] == "Numéro") {
			issue = info[1];
		}
		}
	}
	let articleNum = 0;
	for (let articleTag of ZU.xpath(doc, '//div[p[@class="pub-header w3-padding w3-dark-grey w3-hover-light-gray w3-block w3-left-align"]]')) {
		if (ZU.xpathText(articleTag, './/div[@class="w3-hide"]/@id') != null) {
			items[url + "&publication=" + ZU.xpathText(articleTag, './/div[@class="w3-hide"]/@id')] = articleTag.textContent;
		}
		else items[url + "===" + articleNum] = articleTag.textContent;
		found = true;
		articleInfo[url + "&publication=" + ZU.xpathText(articleTag, './/div[@class="w3-hide"]/@id')] = articleTag.innerHTML;
		articleNum += 1;
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
	let item = new Zotero.Item("journalArticle");
	let articleTitle = article.match(/<u>(.+?)<\/u>/);
	if (articleTitle != null) {
		item.title = articleTitle[1].replace(/<\/?.+?>/g, '');
	}
	let articleCreators = article.match(/<span class="text-uppercase font-weight-light">(.+?)<\/span>/);
	if (articleCreators != null) {
		for (let articleCreator of articleCreators[1].split(", ")) {
			let newCreator = articleCreator.match(/^(.+)\s+\((.+?)\)/);
			if (newCreator != null) {
				let firstName = newCreator[2];
				let lastName = newCreator[1];
				item.creators.push({"firstName": firstName, "lastName": lastName, "creatorType": "author"});
		}
		}
	}
	let pagination = article.match(/p.\s?(\d+(?:-\d+)?)/);
		if (pagination != null) {
			item["pages"] = pagination[1];
	}
	item.url = url.replace(/===\d+$/, "");
	item.issue = issue;
	item.volume = volume;
	item.date = year;
	item.ISSN = issn;
	article = article.replace(/\n/g, " ");
	if (article.match(/<p class="cr-resume">(.+?)<\/p>/g) != null) {
		abstractNum = 0;
		for (let abstract of article.match(/<p class="cr-resume">(.+?)<\/p>/g)) {
			Z.debug(abstract);
			if (abstractNum == 0) item.abstractNote = abstract.match(/<p class="cr-resume">(.+?)<\/p>/)[1];
			else item.notes.push({'note': 'abs:' + abstract.match(/<p class="cr-resume">(.+?)<\/p>/)[1]});
			abstractNum += 1;
		}
	}
	let replacement_list = ["&amp;"];
	let replacement_dict = {"&amp;": "&"};
	for (let replacement_string of replacement_list) {
		item.title = item.title.replace(replacement_string, replacement_dict[replacement_string]);
		}
	if (article.match(/<p style="font-weight: bold">(.+?)<\/p>/g) != null) {
		let citation = article.match(/<p style="font-weight: bold">(.+?)<\/p>/)[0];
		let review = citation.match(/Comptes?\s+rendus?\s+de\s+(.+?)\s+:\s+«(.+?)»((, in Revue des Questions Scientifiques)|(\s+;\s+))/);
		if (review != null) {
			let reviewed_title = review[2];
			let reviewed_author = ZU.cleanAuthor(review[1].split(', ')[0].replace(/\(.+?\)/g, ""), 'author');
			reviewed_author = reviewed_author.lastName + ', ' + reviewed_author.firstName;
			let review_tag = "#reviewed_pub#title::" + reviewed_title + "#name::" + reviewed_author + "#";
			for (let replacement_string of replacement_list) {
				review_tag = review_tag.replace(replacement_string, replacement_dict[replacement_string]);
				}
			item.tags.push(review_tag);
		}
	}
	item.complete();
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

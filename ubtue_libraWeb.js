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
	"lastUpdated": "2021-12-30 14:08:11"
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

var items = {};
var selectArray = {};
var articlesByDOI = {};

// builds a list of DOIs
function getDOIs(doc) {
	// TODO Detect DOIs more correctly.
	// The actual rules for DOIs are very lax-- but we're more strict.
	// Specifically, we should allow space characters, and all Unicode
	// characters except for control characters. Here, we're cheating
	// by not allowing ampersands, to fix an issue with getting DOIs
	// out of URLs.
	// Additionally, all content inside <noscript> is picked up as text()
	// by the xpath, which we don't necessarily want to exclude, but
	// that means that we can get DOIs inside node attributes and we should
	// exclude quotes in this case.
	// DOI should never end with a period or a comma (we hope)
	// Description at: http://www.doi.org/handbook_2000/appendix_1.html#A1-4
	const DOIre = /\b10\.[0-9]{4,}\/[^\s&"']*[^\s&"'.,]/g;

	var dois = [];

	var m, DOI;
	let html = doc.body.innerHTML;
	html = html.replace(/\n/g, "");
	let articles = html.match(/<span class="asterisco">.+?Prezzo:/g);
	articles = articles.splice(1, articles.length);
	for (let article of articles) {
		let articleDOI = article.match(DOIre);
		if (articleDOI == null) {
			articleDOI = "noDOI";
		}
		else articleDOI = articleDOI[0];
		articlesByDOI[articleDOI] = article;
	}
	var treeWalker = doc.createTreeWalker(doc.documentElement, 4, null, false);
	var ignore = ['script', 'style'];
	while (treeWalker.nextNode()) {
		if (ignore.includes(treeWalker.currentNode.parentNode.tagName.toLowerCase())) continue;
		// Z.debug(node.nodeValue)
		DOIre.lastMatch = 0;
		while ((m = DOIre.exec(treeWalker.currentNode.nodeValue))) {
			DOI = m[0];
			if (DOI.endsWith(")") && !DOI.includes("(")) {
				DOI = DOI.substr(0, DOI.length - 1);
			}
			if (DOI.endsWith("}") && !DOI.includes("{")) {
				DOI = DOI.substr(0, DOI.length - 1);
			}
			// only add new DOIs
			if (!dois.includes(DOI)) {
				dois.push(DOI);
			}
		}
	}

	return dois;
}

function detectWeb(doc, url) {
	// Blacklist the advertising iframe in ScienceDirect guest mode:
	// http://www.sciencedirect.com/science/advertisement/options/num/264322/mainCat/general/cat/general/acct/...
	// This can be removed from blacklist when 5c324134c636a3a3e0432f1d2f277a6bc2717c2a hits all clients (Z 3.0+)
	const blacklistRe = /^https?:\/\/[^/]*(?:google\.com|sciencedirect\.com\/science\/advertisement\/)/i;
	
	if (!blacklistRe.test(url)) {
		var DOIs = getDOIs(doc);
		if (DOIs.length) {
			return "multiple";
		}
	}
	return false;
}

function completeDOIs(_doc) {
	// all DOIs retrieved now
	// check to see if there is more than one DOI
	var numDOIs = Object.keys(selectArray).length;
	if (numDOIs == 0) {
		throw new Error("DOI Translator: could not find DOI");
	}
	else {
		Zotero.selectItems(selectArray, function (selectedDOIs) {
			if (!selectedDOIs) return true;

			for (var DOI in selectedDOIs) {
				let url = "https://doi.org/" + DOI;
				let articleHTML = articlesByDOI[DOI];
				let pagination = articleHTML.match(/Pagine:\s?(\d+(?:-\d+))[^\d]/);
				if (pagination != null) {
					items[DOI]["pages"] = pagination[1];
				}
				for (let creator of items[DOI].creators) {
				for (let replaceChar in replaceChars) {
					items[DOI]["title"] = items[DOI]["title"].replace(replaceChar, replaceChars[replaceChar]);
						creator.lastName = creator.lastName.replace(replaceChar, replaceChars[replaceChar]);
						creator.firstName = creator.firstName.replace(replaceChar, replaceChars[replaceChar]);
					}
					let dateOfBirth = creator.firstName.match(/,\s+\d{4}-/);
					if (dateOfBirth != null) {
						creator.firstName = creator.firstName.substring(0, dateOfBirth.index);
					}
				}
				items[DOI].complete();
			}
			return true;
		});
	}
}

function retrieveDOIs(dois, doc) {
	let numDois = dois.length;

	for (const DOI of dois) {
		const translate = Zotero.loadTranslator("search");
		translate.setTranslator("b28d0d42-8549-4c6d-83fc-8382874a5cb9");
	
		translate.setSearch({ itemType: "journalArticle", DOI: DOI });
	
		// don't save when item is done
		translate.setHandler("itemDone", function (_translate, item) {
			selectArray[item.DOI] = item.title;
			if (!item.title) {
				Zotero.debug("No title available for " + item.DOI);
				item.title = "[No Title]";
				selectArray[item.DOI] = "[" + item.DOI + "]";
			}
			items[item.DOI] = item;
		});
		/* eslint-disable no-loop-func */
		translate.setHandler("done", function () {
			numDois--;
			if (numDois <= 0) {
				completeDOIs(doc);
			}
		});
	
		// Don't throw on error
		translate.setHandler("error", function () {});
	
		translate.translate();
	}
}

function doWeb(doc) {
	var dois = getDOIs(doc);
	retrieveDOIs(dois, doc);
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

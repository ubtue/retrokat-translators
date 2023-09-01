{
	"translatorID": "d967e73c-74b8-4c38-aa48-4ddcca48e01a",
	"label": "ubtue_OpenDigi_Tuebingen",
	"creator": "Paula Hähndel",
	"target": "ub.uni-tuebingen.de/opendigi",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-09-01 10:06:39"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Universitätsbibliothek Tübingen.  All rights reserved.
	Modified 2023 by Paula Hähndel
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

function detectWeb(doc, url) {
	return "multiple";
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//ul/li/ul/li[a]');
	for (let i = 0; i < rows.length; i++) {
		let row = rows[i].innerHTML;
		//Z.debug(items)
		if (row.match(/^<a href="#" data-pages="\[(?:\d+,?)+\]">\d/)) {
			let title = row.match(/^<a href="#" data-pages="\[(?:\d+,?)+\]">\d+(?:\[\d+\])?[a-z]?\s*-?\/?\s*\d*(?:\[\d+\])?[a-z]? ?([^<]+)<span/)[1];
			let href = "";
			if (row.match(/<a class="fa noul" href="([^\s"]+)/)) {
				href = row.match(/<a class="fa noul" href="([^\s"]+)/)[1];
			}
			else {
				if (row.match(/<a href="([^\s"]+)" class="fa noul"/)) {
					href = row.match(/<a href="([^\s"]+)" class="fa noul"/)[1];
				}
			}
			found = true;
			items[href] = title;
		}
		//if (!href || !title) continue;
		//found = true;
		//items[href] = title;
	}
	return found ? items : false;
}

function GetMetaData(articles, doc, url) {
	let baseurl = url.substring(0,url.indexOf("/opendigi"));
	//let translator = Zotero.loadTranslator("web");
	//translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	//translator.setDocument(doc);
	//translator.setHandler("itemDone", function (t, item) {
	let rows = ZU.xpath(doc, '//ul/li/ul/li[a]');
	let journal = ZU.xpathText(doc, '//div//dl');
	pubTitle = journal.match(/(?:(?:Title)|(?:Titel))\s*((?:[^\s] ?)+[^\s])\s*,/)[1];
	volumenr = journal.match(/(?:(?:Volume)|(?:Band))\s*([^\s]+\s?[^\s]*)/)[1]; //.replace(/\./g,",");
	if (pubTitle == "Jahrschrift für Theologie und Kirchenrecht der Katholiken") {
		volumenr = volumenr.match(/(\d+)/)[1];
	}
	date = journal.match(/(?:(?:Year of publication)|(?:Erscheinungsjahr))\s*(\d+)/)[1];
	let hefte = ZU.xpath(doc, '//div/ul/li[a]');
	let heftdois = {};
	for (let r=0; r < hefte.length; r++){
		heft = hefte[r].innerHTML;
		heft = heft.replace(" class=\"active\"",""); //TODO Das überall ergänzen
		if (heft.includes("Heft")) {
			if (heft.includes("Beilage")) {
				/*item = new Zotero.Item('journalArticle');
				item.title = heft.match(/Heft[^:]+:\s?([^<]+)</)[1];
				item.issue = heft.match(/>([^:]*Heft[^:]+):/)[1].trim();
				item.volume = volumenr;
				item.date = date;
				item.publicationTitle = pubTitle;
				item.complete();
				*/
			}
			else if (heft.match(/^<a href="#" data-pages="\[(?:\d+,?)+\]">Heft/)) {
				let heftnr = heft.match(/Heft (\d+)/)[1];
				if (heft.match(/Heft \d+[^\d<]+\d/)) {
					heftnr = heft.match(/Heft (\d+[^\d<]+\d+)/)[1].replace(/\s/g,"");
					heftnr = heftnr.replace("und", "/");
				}
				heft = heft.substring(heft.indexOf("Heft"));
				if (!heft.includes("data-pages")) { //früher: f (!heft.includes("class=\"fa noul\""))
					heft = hefte[r+1].innerHTML; //vllt. ist der Inhalt des Heftes in der nächsten Datenzeile
					heft = heft.replace(" class=\"active\"","");
				}
				if (heft.match(/<a class="fa noul" href="[^\s"]+/)) {
					heftdois[heftnr] = heft.match(/<a class="fa noul" href="[^\s"]+/g);
				}
				else {
					if (heft.match(/<a href="([^\s"]+)" class="fa noul"/)) {
						heftdois[heftnr] = heft.match(/<a href="([^\s"]+)" class="fa noul"/g);
					}
				}
				for (let i in heftdois[heftnr]) {
					if (heftdois[heftnr][i].match(/<a class="fa noul" href="([^\s"]+)/)) {
						heftdois[heftnr][i] = heftdois[heftnr][i].match(/<a class="fa noul" href="([^\s"]+)/)[1];
					}
					else if (heftdois[heftnr][i].match(/<a href="([^\s"]+)" class="fa noul"/)) {
						heftdois[heftnr][i] = heftdois[heftnr][i].match(/<a href="([^\s"]+)" class="fa noul"/)[1];
					}
				}
			}
		}
	}
	let reviewdois = [];
	for (let r in rows){
		review = rows[r].innerHTML;
		if(review.includes(">Rezension")) {
			if (review.match(/^<a href="#" data-pages="\[(?:\d+,?)+\]">Rezension/)) {
				reviewdoi = review.match(/<a class="fa noul" href="[^\s"]+/g);
				for (let i in reviewdoi) {
					reviewdois.push(reviewdoi[i].match(/<a class="fa noul" href="([^\s"]+)/)[1]);
				}
			}
		}
	}
	
	for (let a in articles) {
		item = new Zotero.Item('journalArticle');
		if (a.match(/https?:\/\//)) {
			if (a.includes("https://")) item.url = a;
			else item.url = a.substring(0,4) + "s" + a.substring(4);
		}
		else item.url = baseurl + a;
		if (a.match(/\d{2}.\d{5}\/[^s]+/)) {
			item.DOI = a.match(/\d{2}.\d{5}\/[^s]+/)[0];
		}
		item.title = articles[a];
		let row = "";
		for (let r in rows){
			row = rows[r].innerHTML;
			if (row.match(/^<a href="#" data-pages="\[(?:\d+,?)+\]">\d/) && row.includes(a)) {
				row = rows[r].innerHTML;
				break;
			}
		}
		if (row.match(/<span class="info">\s[^\s]\s[^<]+</)) {
			names = row.match(/<span class="info">\s[^\s]\s([^<]+)</)[1].replace("&nbsp;"," ").split("; ");
			for (let j in names) {
				let name = names[j].trim().replace(/\.([^\s])/g,'. $1'); //Ergänzen von Leerzeichen zwischen Initialen, falls fehlt
				let firstname = "";
				let lastname = "";
				if (name.match(/,?[^,]+/)) {
					lastname = name.match(/,?([^,]+)/)[1].trim();
				}
				if (name.match(/,[^,]+/)) {
					firstname = name.match(/,([^,]+)/)[1].trim();
				}
				item.creators.push({"firstName": firstname, "lastName": lastname, "creatorType": "author"})
			}
		}
		for (let r in heftdois) {
			for (let i in heftdois[r]) {
				if (heftdois[r][i] == a) {
					item.issue = r;
				}
			}
		}
		for (let i in reviewdois) {
			if (reviewdois[i] == a) {
				item.tags.push({"tag": "Book Review"});
			}
		}
		if (["Recensionen", "Rezensionen", "Bücheranzeigen", "Bücheranzeige", "Kleine Kritiken", "Kritiken"].includes(item.title)
				|| item.title.match(/Litt?erarische.+bers..hten/)) {
			item.tags.push({"tag": "Book Review"});
		}
		item.volume = volumenr;
		item.date = date;
		item.publicationTitle = pubTitle;
		//item.place = journal.match(/Place\(s\)\s*((?:[^\s] ?)+[^\s])/)[1];
		//item.issue = issueinfo.match(/Heft (\d+)/)[1];
		item.pages = row.match(/\]">(\d+(?:\[\d+\])?[a-z]?\s*-?\/?\s*\d*(?:\[\d+\])?[a-z]?)/)[1];
		item.pages = item.pages.replace(/(?:\[\d+\])/g,"");
		item.pages = item.pages.replace("/","-");
		item.pages = item.pages.replace(/\s/g,"");
		item.pages = item.pages.trim().replace(/^([^-]+)-\1$/, '$1');
		item.attachments = [];
		item.notes.push({"note": "LF:"});
		item.complete();
	}
	//translator.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			//let articles = [];
			//for (let i in items) {
			//	articles.push(i);
			//}
			GetMetaData(items, doc, url);
		});
	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
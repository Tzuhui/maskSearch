// var mymap = L.map('mapid').setView([22.8, 120], 8);
$.LoadingOverlay('show');

var mymap = L.map('mapid', {
	center: [25, 121.6],
	zoom: 9
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '<a target="_blank" href="https://www.openstreetmap.org/">© OpenStreetMap 貢獻者</a>',
	maxZoom: 18,
}).addTo(mymap);

function csvJSON(csv){
  const lines = csv.split("\n");
  const result = [];
  const headers = lines[0].split(",");
  for(let i = 1;i < lines.length; i++) {
		const obj = {};
		const currentline = lines[i].split(",");
		for(let j=0; j < headers.length; j++){
			obj[headers[j]] = currentline[j];
		}
		result.push(obj);
  }
  //return result; //JavaScript object
  return JSON.stringify(result); //JSON
}
function getCSV(path) {
	return new Promise((resolve, reject) => {
		const oReq = new XMLHttpRequest();
		oReq.onload = function (e) {
			const data = JSON.parse(csvJSON(oReq.response));
			resolve(data);
		};
		oReq.open("GET", path);
		oReq.send();
	});
}
function getXML(path) {
	return new Promise((resolve, reject) => {
		const oReq = new XMLHttpRequest();
		oReq.onload = function (e) {
			const data = JSON.parse(oReq.response);
			resolve(data);
		};
		oReq.open("GET", path);
		oReq.send();
	});
}

const maskXML = getCSV('https://us-central1-my-kk-project-3c20a.cloudfunctions.net/maskData');
const storeXML = getXML('./med-store.json');
const cityXML = getXML('./latlng.json');

Promise.all([maskXML, storeXML, cityXML]).then(resultData => {
	const maskData = resultData[0];
	const storeData = resultData[1];
	const cityData = resultData[2];

	$.LoadingOverlay('hide');

	createCitySelect(cityData);
	const citySelect = document.getElementById('city');
	findStore(storeData, maskData, citySelect.options[0].value);
	findDistrict(storeData, cityData, maskData, citySelect.options[0].value);

	// 監聽縣市 select
	citySelect.addEventListener('change', function () {
		selcetedData = [];
		const citySelectValue = document.getElementById('city').value;
		findStore(storeData, maskData, citySelectValue);
		findDistrict(storeData, cityData, maskData, citySelectValue);
	});
	// 監聽 search 按鈕
	const searchBtn = document.getElementById('searchBtn');
	searchBtn.addEventListener('click', function() {
		getFeaturesInView();
		const cityBackData = findStore(storeData, maskData, citySelect.value);
		const searchValue = document.getElementById('searchText').value;
		let storeStr = '';
		let storeArr = [];
		cityBackData.forEach(item => {
			if (item['address'].includes(searchValue) || item['name'].includes(searchValue)) {
				storeStr += renderToPageTemplate(item);
				storeArr.push(item);
			}
		});
		storePosition.innerHTML = storeStr;
		document.getElementById('total').innerHTML = `有取得口罩數量的有 ${storeArr.length} 家`;
		if (cityBackData.length > 0) {
			centerMarker(cityBackData[0])
		}
	})
});

function createCitySelect(city) { // 建立縣市 select
	const citySelect = document.getElementById('city');
	const cityArray = city.map(item => item.city);
	const notRepeatCity = cityArray.filter(function (element, index, arr) {
		return arr.indexOf(element) === index;
	});
	let str = '';
	notRepeatCity.forEach(item => {
		str += `<option>${item}</option>`
	});
	citySelect.innerHTML = str;
}

function findDistrict(store, city, mask, value) {
	const districtSelect = document.getElementById('district');
	let substr = '<option value="all">選擇鄉鎮市區</option>';
	city.forEach(item => {
		if (item.city == value) {
			substr += `<option>${item.district}</option>`
		}
	})
	districtSelect.innerHTML = substr;

	// 鄉鎮市區 select 監聽
	districtSelect.addEventListener('change', function () {
		getFeaturesInView();
		document.getElementById('searchText').value = '';
		const districtValue = document.getElementById('district').value;
		if (districtValue == 'all') {
			const cityValue = document.getElementById('city').value;
			findStore(store, mask, cityValue);
		} else {
			findDistrictStore(districtValue);
		}
	});
}

function findStore(store, mask, value) {
	const storePosition = document.getElementById('storePosition');
	let storeStr = '';
	selcetedData = [];
	store.forEach(item => {
		if (item['address'].includes(value)) {
			mask.forEach(ele => {
				if (item['id'] == ele['醫事機構代碼']) {
					item.adultMask = ele['成人口罩剩餘數'];
					item.childMask = ele['兒童口罩剩餘數'];
					item.updateTime = ele['來源資料時間'];
				}
			})
			if (item['adultMask']) {
				selcetedData.push(item);
				storeStr += `[${item['name']}] <br>
	口罩剩餘：<strong>成人 - ${item['adultMask']? item['adultMask'] + ' 個': '未取得資料'}/ 兒童 - ${item['childMask']? item['childMask'] + ' 個': '未取得資料'}</strong><br>
	地址: <a href="https://www.google.com.tw/maps/place/${item['address']}" target="_blank">${item['address']}</a><br>
	電話: ${item['tel']}<br>
	<small>最後更新時間: ${item['updateTime']}</small><hr>`;
			}
		}
	})
	storePosition.innerHTML = storeStr;
	document.getElementById('total').innerHTML = `有取得口罩數量的有 ${selcetedData.length} 家`;
	return selcetedData;
}

function getFeaturesInView() { // 移除地圖上的 marker
	mymap.eachLayer(function (layer) {
		if (layer instanceof L.Marker) {
			mymap.removeLayer(layer);
		}
	});
}

function addMapMarker(y, x, item) {
	L.marker([y, x]).addTo(mymap).bindPopup(`[${item['name']}] <br>
		口罩剩餘：<strong>成人 - ${item['adultMask']? item['adultMask'] + ' 個': '未取得資料'}/ 兒童 - ${item['childMask']? item['childMask'] + ' 個': '未取得資料'}</strong><br>
	地址: <a href="https://www.google.com.tw/maps/place/${item['address']}" target="_blank">${item['address']}</a><br>
	電話: ${item['tel']}<br>
	<small>最後更新時間: ${item['updateTime']}</small>`);
}

function findDistrictStore(value) {
	let storeStr = '';
	let selcetedDataList = []; // 用於計算篩選鄉鎮市後的數量
	selcetedData.forEach((item)=> {
		if (item['address'].includes(value)) {
			if (item['adultMask']) {
				selcetedDataList.push(item);
				storeStr += renderToPageTemplate(item);
			}
		}
	})
	storePosition.innerHTML = storeStr;
	document.getElementById('total').innerHTML = `有取得口罩數量的有 ${selcetedDataList.length} 家`;
	centerMarker(selcetedData[0]);
}

function renderToPageTemplate(item) {
	if (item.x && typeof item.x == 'string') {
		const x = item.x.split('\n')[0]
		const y = item.y.split('\n')[0]
		addMapMarker(y, x, item);
	} else {
		addMapMarker(item.y, item.x, item);
	}
	return `[${item['name']}] <br>
	口罩剩餘：<strong>成人 - ${item['adultMask']? item['adultMask'] + ' 個': '未取得資料'}/ 兒童 - ${item['childMask']? item['childMask'] + ' 個': '未取得資料'}</strong><br>
	地址: <a href="https://www.google.com.tw/maps/place/${item['address']}" target="_blank">${item['address']}</a><br>
	電話: ${item['tel']}<br>
	<small>最後更新時間: ${item['updateTime']}</small><hr>`;
}

function centerMarker(centerData) {
	if (centerData.x && typeof centerData.x == 'string') {
		const x = centerData.x.split('\n')[0]
		const y = centerData.y.split('\n')[0]
		mymap.panTo(new L.LatLng(y, x));
	} else {
		mymap.panTo(new L.LatLng(centerData.y, centerData.x));
	}
}
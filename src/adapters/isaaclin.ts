import long2short from './long2short'; // some city names are NOT short names so we also convert them here

function convertStat(source: any): any {
  return {
    confirmed: source.confirmedCount,
    suspected: source.suspectedCount,
    cured: source.curedCount,
    dead: source.deadCount
  };
}

function convertCountry(source: any): any {
  let provinces = {};
  
  source.forEach(
    (p: { provinceShortName: string }) =>
      (provinces[p.provinceShortName] = convertProvince(p))
  );

  // currently we only support china
  return {
    name: '中国',
    confirmed: 0,
    suspected: 0,
    cured: 0,
    dead: 0,
    provinces
  };
}

function convertProvince(source: any): any {
  let cities = {};
  if (source.cities && source.cities.length > 0) {
    source.cities.forEach(
      (c: { cityName: string }) =>
        // 把省级的更新时间传入市级由于市级没有各自的数据更新时间
        (cities[long2short(c.cityName)] = convertCity(c, source.updateTime))
    );
  }
  return {
    name: source.provinceShortName,
    timestamp: source.updateTime,
    cities,
    ...convertStat(source)
  };
}

function convertCity(source: any, updateTime: any): any {
  return {
    name: long2short(source.cityName),
    timestamp: updateTime, // 使用传入的省级数据更新时间
    ...convertStat(source)
  };
}

function roundTime(t: number, resolution: number) {
  const offset = resolution >= 24 * 3600000 ? 8 * 3600000 : 0; // consider locale if resolution > 1 day
  return Math.floor((t + offset) / resolution) * resolution - offset;
}

function fillForward(series: any) {
  const all_ts = Object.keys(series).sort();
  all_ts.forEach((t, i) => {
    if (i < all_ts.length - 1) {
      Object.keys(series[t]).forEach(name => {
        const next_t = parseInt(all_ts[i + 1], 10);
        if (series[next_t][name] === undefined) {
          series[next_t][name] = series[t][name];
        }
      });
    }
  });
}

function convertProvincesSeries(source: any, resolution: number, shouldFillForward = false): any {
  let res: any = {};
  source
    .sort((item: any) => item.updateTime)
    .forEach((item: any) => {
      const t = roundTime(item.updateTime, resolution);
      if (res[t] === undefined) {
        res[t] = {};
      }
      const prov = convertProvince(item);
      res[t][prov.name] = prov;
    });
  if (shouldFillForward) {
    fillForward(res);
  }
  return res;
}

function extractCitiesSeries(series: any, name: string, resolution: number, shouldFillForward = false): any {
  let res: any = {};
  Object.values(series).forEach((provs: any) => {
    if (provs[name] !== undefined) {
      res[roundTime(provs[name].timestamp, resolution)] = provs[name].cities;
    }
  });
  if (shouldFillForward) {
    fillForward(res);
  }
  return res;
}

function convertCountrySeries(source: any, resolution: number): any {
  let res: any = {};
  source.forEach((item: any) => {
    const t = roundTime(item.updateTime, resolution);
    if (res[t] === undefined) {
      res[t] = {};
    }
    res[t] = item;
  });
  return res;
}

export {
  convertCountry,
  convertProvince,
  convertCity,
  convertProvincesSeries,
  convertCountrySeries,
  extractCitiesSeries
};

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.search = exports.getIds = exports.loadData = void 0;
var TMDB_API_KEY = 'e70f4a66202d9b5df3586802586bc7d2';
function loadConfig() {
    return __awaiter(this, void 0, void 0, function () {
        var response, base_url;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch("https://api.themoviedb.org/3/configuration?api_key=".concat(TMDB_API_KEY))];
                case 1:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 2:
                    base_url = (_a.sent()).images.base_url;
                    return [2 /*return*/, {
                            base_url: base_url,
                            small_poster_size: 'w342',
                            big_poster_size: 'original',
                            backdrop_size: 'original'
                        }];
            }
        });
    });
}
var config = loadConfig();
function loadData(url) {
    return __awaiter(this, void 0, void 0, function () {
        var match, _a, type, id, _b, response, _c, title, overview, release_date, poster_path, backdrop_path, _d, base_url, small_poster_size, big_poster_size, backdrop_size, response, _e, name_1, overview, last_air_date, poster_path, backdrop_path, _f, base_url, small_poster_size, big_poster_size, backdrop_size;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    match = url.match(/https:\/\/www.themoviedb.org\/(?<type>movie|tv)\/(?<id>\d+)/);
                    if (!(match !== null)) return [3 /*break*/, 9];
                    _a = match.groups, type = _a.type, id = _a.id;
                    _b = type;
                    switch (_b) {
                        case 'movie': return [3 /*break*/, 1];
                        case 'tv': return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 9];
                case 1: return [4 /*yield*/, fetch("https://api.themoviedb.org/3/movie/".concat(id, "?api_key=").concat(TMDB_API_KEY))];
                case 2:
                    response = _g.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    _c = _g.sent(), title = _c.title, overview = _c.overview, release_date = _c.release_date, poster_path = _c.poster_path, backdrop_path = _c.backdrop_path;
                    return [4 /*yield*/, config];
                case 4:
                    _d = _g.sent(), base_url = _d.base_url, small_poster_size = _d.small_poster_size, big_poster_size = _d.big_poster_size, backdrop_size = _d.backdrop_size;
                    return [2 /*return*/, {
                            tmdbUrl: url,
                            title: title,
                            description: overview,
                            released: new Date(release_date),
                            icon: "".concat(base_url).concat(small_poster_size).concat(poster_path, "?api_key=").concat(TMDB_API_KEY),
                            image: "".concat(base_url).concat(big_poster_size).concat(poster_path, "?api_key=").concat(TMDB_API_KEY),
                            backdrop: "".concat(base_url).concat(backdrop_size).concat(backdrop_path, "?api_key=").concat(TMDB_API_KEY)
                        }];
                case 5: return [4 /*yield*/, fetch("https://api.themoviedb.org/3/tv/".concat(id, "?api_key=").concat(TMDB_API_KEY))];
                case 6:
                    response = _g.sent();
                    return [4 /*yield*/, response.json()];
                case 7:
                    _e = _g.sent(), name_1 = _e.name, overview = _e.overview, last_air_date = _e.last_air_date, poster_path = _e.poster_path, backdrop_path = _e.backdrop_path;
                    return [4 /*yield*/, config];
                case 8:
                    _f = _g.sent(), base_url = _f.base_url, small_poster_size = _f.small_poster_size, big_poster_size = _f.big_poster_size, backdrop_size = _f.backdrop_size;
                    return [2 /*return*/, {
                            tmdbUrl: url,
                            title: name_1,
                            description: overview,
                            released: new Date(last_air_date),
                            icon: "".concat(base_url).concat(small_poster_size).concat(poster_path, "?api_key=").concat(TMDB_API_KEY),
                            image: "".concat(base_url).concat(big_poster_size).concat(poster_path, "?api_key=").concat(TMDB_API_KEY),
                            backdrop: "".concat(base_url).concat(backdrop_size).concat(backdrop_path, "?api_key=").concat(TMDB_API_KEY)
                        }];
                case 9: throw new Error("Unknown URL format");
            }
        });
    });
}
exports.loadData = loadData;
function getIds(url) {
    return __awaiter(this, void 0, void 0, function () {
        var match, id, response, imdb_id;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    match = url.match(/https:\/\/www.themoviedb.org\/(?<type>movie|tv)\/(?<id>\d+)/);
                    if (!(match !== null)) return [3 /*break*/, 3];
                    id = match.groups.id;
                    return [4 /*yield*/, fetch("https://api.themoviedb.org/3/movie/".concat(id, "/external_ids?api_key=").concat(TMDB_API_KEY))];
                case 1:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 2:
                    imdb_id = (_a.sent()).imdb_id;
                    return [2 /*return*/, [url, "https://www.imdb.com/title/".concat(imdb_id)]];
                case 3: return [2 /*return*/, [url]];
            }
        });
    });
}
exports.getIds = getIds;
function search(name) {
    return __awaiter(this, void 0, void 0, function () {
        var response, results, _a, base_url, small_poster_size, big_poster_size, backdrop_size;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, fetch("https://api.themoviedb.org/3/search/movie?query=".concat(encodeURIComponent(name), "&api_key=").concat(TMDB_API_KEY))];
                case 1:
                    response = _b.sent();
                    return [4 /*yield*/, response.json()];
                case 2:
                    results = (_b.sent()).results;
                    return [4 /*yield*/, config];
                case 3:
                    _a = _b.sent(), base_url = _a.base_url, small_poster_size = _a.small_poster_size, big_poster_size = _a.big_poster_size, backdrop_size = _a.backdrop_size;
                    return [2 /*return*/, results.map(function (_a) {
                            var id = _a.id, title = _a.title, overview = _a.overview, release_date = _a.release_date, poster_path = _a.poster_path, backdrop_path = _a.backdrop_path;
                            return ({
                                tmdbUrl: "https://www.themoviedb.org/movie/".concat(id),
                                title: title,
                                description: overview,
                                released: new Date(release_date),
                                icon: "".concat(base_url).concat(small_poster_size).concat(poster_path, "?api_key=").concat(TMDB_API_KEY),
                                image: "".concat(base_url).concat(big_poster_size).concat(poster_path, "?api_key=").concat(TMDB_API_KEY),
                                backdrop: "".concat(base_url).concat(backdrop_size).concat(backdrop_path, "?api_key=").concat(TMDB_API_KEY)
                            });
                        })];
            }
        });
    });
}
exports.search = search;

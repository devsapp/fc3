"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultProfilePath = exports.getProfileFile = exports.getConfig = void 0;
var os_1 = __importDefault(require("os"));
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var js_yaml_1 = __importDefault(require("js-yaml"));
var i18n_1 = require("i18n");
function getConfig(key) {
    var profile = getProfileFile();
    return profile[key];
}
exports.getConfig = getConfig;
function getProfileFile() {
    var profileResult = {};
    try {
        var profileFilePath = getDefaultProfilePath();
        profileResult = js_yaml_1.default.load(fs_1.default.readFileSync(profileFilePath, 'utf8')) || {};
    }
    catch (e) {
        console.log(e);
    }
    return profileResult;
}
exports.getProfileFile = getProfileFile;
function getDefaultProfilePath() {
    return path_1.default.join(os_1.default.homedir(), '.s', 'set-config.yml');
}
exports.getDefaultProfilePath = getDefaultProfilePath;
var i18n = new i18n_1.I18n({
    locales: ['en', 'zh'],
    directory: path_1.default.join(__dirname, '..', '..', 'locales'),
});
var locale = getConfig('locale');
if (locale) {
    i18n.setLocale(locale);
}
else {
    i18n.setLocale('en');
}
exports.default = i18n;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb21tb24vaTE4bi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSwwQ0FBb0I7QUFDcEIsMENBQW9CO0FBQ3BCLDhDQUF3QjtBQUN4QixvREFBMkI7QUFDM0IsNkJBQTRCO0FBRTVCLFNBQWdCLFNBQVMsQ0FBQyxHQUFXO0lBQ2pDLElBQU0sT0FBTyxHQUFHLGNBQWMsRUFBRSxDQUFDO0lBQ2pDLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3hCLENBQUM7QUFIRCw4QkFHQztBQUdELFNBQWdCLGNBQWM7SUFDMUIsSUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFBO0lBQ3RCLElBQUk7UUFDQSxJQUFNLGVBQWUsR0FBRyxxQkFBcUIsRUFBRSxDQUFDO1FBQ2hELGFBQWEsR0FBRyxpQkFBSSxDQUFDLElBQUksQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztLQUM3RTtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNsQjtJQUVELE9BQU8sYUFBYSxDQUFDO0FBQ3pCLENBQUM7QUFWRCx3Q0FVQztBQUdELFNBQWdCLHFCQUFxQjtJQUNqQyxPQUFPLGNBQUksQ0FBQyxJQUFJLENBQUMsWUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzNELENBQUM7QUFGRCxzREFFQztBQUVELElBQU0sSUFBSSxHQUFHLElBQUksV0FBSSxDQUFDO0lBQ2xCLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsU0FBUyxFQUFFLGNBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDO0NBQ3pELENBQUMsQ0FBQztBQUdILElBQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNuQyxJQUFJLE1BQU0sRUFBRTtJQUNSLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7Q0FDMUI7S0FBTTtJQUNILElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDeEI7QUFFRCxrQkFBZSxJQUFJLENBQUMifQ==
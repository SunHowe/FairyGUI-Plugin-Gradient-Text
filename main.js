"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const csharp_1 = require("csharp");
const puerts_1 = require("puerts");
const App = csharp_1.FairyEditor.App;
App.pluginManager.LoadUIPackage(App.pluginManager.basePath + "/" + eval("__dirname") + '/CustomInspector');
var GradientDir;
(function (GradientDir) {
    GradientDir["up"] = "up";
    GradientDir["down"] = "down";
    GradientDir["left"] = "left";
    GradientDir["right"] = "right";
})(GradientDir || (GradientDir = {}));
class GradientColorInspector extends csharp_1.FairyEditor.View.PluginInspector {
    check_vertical;
    check_horizontal;
    ctrl_vertical;
    ctrl_horizontal;
    inputs = {};
    colors = {};
    last_obj;
    dirs = [GradientDir.up, GradientDir.left, GradientDir.right, GradientDir.down];
    gradient_text;
    allowObjectTypes = ["text", "richtext", "inputtext", "Button", "Label"];
    color32List;
    constructor() {
        super();
        let List = puerts_1.$generic(csharp_1.System.Collections.Generic.List$1, csharp_1.UnityEngine.Color32);
        this.color32List = new List();
        this.panel = csharp_1.FairyGUI.UIPackage.CreateObject("CustomInspector", "GradientColor").asCom;
        this.ctrl_vertical = this.panel.GetController("vertical");
        this.ctrl_horizontal = this.panel.GetController("horizontal");
        for (const key in this.dirs) {
            let dir = this.dirs[key];
            let n = this.panel.GetChild(dir);
            let input = n.GetChild("color");
            this.inputs[dir] = input;
            input.AddEventListener(csharp_1.FairyEditor.FEvents.SUBMIT, (context) => {
                console.log(dir, input.colorValue);
                this.set_color(dir, input.colorValue);
            });
        }
        this.check_vertical = this.panel.GetChild("check_vertical").asButton;
        this.check_vertical.selected = false;
        this.check_vertical.onChanged.Add(() => {
            let obj = App.activeDoc.inspectingTarget;
            let color = this.get_object_color(obj);
            if (!this.colors[GradientDir.up]) {
                this.init_dir_color(GradientDir.up, color);
            }
            if (!this.colors[GradientDir.down]) {
                this.init_dir_color(GradientDir.down, color);
            }
            this.update_colors();
        });
        this.check_horizontal = this.panel.GetChild("check_horizontal").asButton;
        this.check_horizontal.selected = false;
        this.check_horizontal.onChanged.Add(() => {
            if (this.check_horizontal.selected) {
                let obj = App.activeDoc.inspectingTarget;
                let color = this.get_object_color(obj);
                if (!this.colors[GradientDir.left]) {
                    this.init_dir_color(GradientDir.left, color);
                }
                if (!this.colors[GradientDir.right]) {
                    this.init_dir_color(GradientDir.right, color);
                }
            }
            this.update_colors();
        });
        this.updateAction = () => { return this.update_colors(); };
    }
    get_text_field(gObject) {
        if (gObject.objectType != "component") {
            return gObject;
        }
        let gComponent = gObject;
        let gButton = gComponent.extention;
        if (gButton != null) {
            console.log("gButton");
            return gButton.GetTextField();
        }
        let gLabel = gComponent.extention;
        if (gLabel != null) {
            console.log("gLabel");
            return gLabel.GetTextField();
        }
        return null;
    }
    get_object_color(gObject) {
        let inputField = this.get_text_field(gObject);
        return inputField != null ? inputField.color : new csharp_1.UnityEngine.Color(1.0, 1.0, 1.0, 1.0);
    }
    init_dir_color(dir, color) {
        this.colors[dir] = color;
        this.inputs[dir].colorValue = color;
    }
    update_colors() {
        let obj = App.activeDoc.inspectingTarget;
        if (!obj) {
            return false;
        }
        let objTypeName = this.getObjectTypeName(obj);
        if (this.allowObjectTypes.indexOf(objTypeName) < 0) {
            return false;
        }
        if (obj != this.last_obj) {
            this.init_data(obj);
            this.last_obj = obj;
            this.update_color(obj, true);
        }
        else {
            this.update_color(obj, false);
        }
        return true; //if everything is ok, return false to hide the inspector
    }
    set_color(dir, color) {
        if (this.colors[dir] == color)
            return;
        this.colors[dir] = color;
        this.update_colors();
    }
    update_color(obj, force) {
        let color = this.get_color_text();
        if (this.gradient_text == color) {
            if (!force) {
                return;
            }
        }
        else {
            this.gradient_text = color;
            let customData = obj.GetProperty("customData");
            let customDataObj = null;
            if (customData != null && customData != "") {
                try {
                    customDataObj = JSON.parse(obj.customData);
                }
                catch (error) {
                    console.log("json error:", error);
                    customDataObj = {};
                }
            }
            else {
                customDataObj = {};
            }
            if (color.length > 0) {
                customDataObj["gradient"] = color;
            }
            else {
                delete customDataObj["gradient"];
            }
            let json = "";
            if (Object.keys(customDataObj).length > 0) {
                json = JSON.stringify(customDataObj);
            }
            obj.docElement.SetProperty("customData", json);
        }
        let textField = this.get_text_field(obj);
        if (textField == null) {
            return;
        }
        let tf = textField.textFormat;
        tf.gradientColor = this.get_color32_array();
        // textField.textFormat = tf;
        // 这里无法直接设置textFormat 用这种方式间接触发其更新
        let text = textField.text;
        textField.text = "";
        textField.text = text;
    }
    // 获取对象类型
    getObjectTypeName(gObject) {
        let gComponent = gObject;
        if (gComponent != null && gComponent.extention != null) {
            return gComponent.extention._type;
        }
        return gObject.objectType;
    }
    get_color32_array() {
        if (!this.check_vertical.selected && !this.check_horizontal.selected) {
            return null;
        }
        this.color32List.Clear();
        if (this.check_vertical.selected) {
            if (this.check_horizontal.selected) {
                this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.up))); // 左上角
                this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.left))); // 左下角
                this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.right))); // 右上角
                this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.down))); // 右下角
            }
            else {
                this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.up)));
                this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.down)));
                this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.up)));
                this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.down)));
            }
        }
        else if (this.check_horizontal.selected) {
            this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.left)));
            this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.left)));
            this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.right)));
            this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.right)));
        }
        return this.color32List.ToArray();
    }
    get_color_text() {
        if (!this.check_vertical.selected && !this.check_horizontal.selected)
            return "";
        let s = "";
        if (this.check_vertical.selected) {
            if (this.check_horizontal.selected) {
                s += csharp_1.FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.up)); // 左上角
                s += "," + csharp_1.FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.left)); // 左下角
                s += "," + csharp_1.FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.right)); // 右上角
                s += "," + csharp_1.FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.down)); // 右下角
            }
            else {
                s += csharp_1.FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.up));
                s += "," + csharp_1.FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.down));
                s += "," + csharp_1.FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.up));
                s += "," + csharp_1.FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.down));
            }
        }
        else if (this.check_horizontal.selected) {
            s += csharp_1.FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.left));
            s += "," + csharp_1.FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.left));
            s += "," + csharp_1.FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.right));
            s += "," + csharp_1.FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.right));
        }
        return s;
    }
    get_color_32(c) {
        let color32 = new csharp_1.UnityEngine.Color32();
        color32.r = csharp_1.UnityEngine.Mathf.Round(csharp_1.UnityEngine.Mathf.Clamp01(c.r) * 255.0);
        color32.g = csharp_1.UnityEngine.Mathf.Round(csharp_1.UnityEngine.Mathf.Clamp01(c.g) * 255.0);
        color32.b = csharp_1.UnityEngine.Mathf.Round(csharp_1.UnityEngine.Mathf.Clamp01(c.b) * 255.0);
        color32.a = csharp_1.UnityEngine.Mathf.Round(csharp_1.UnityEngine.Mathf.Clamp01(c.a) * 255.0);
        return color32;
    }
    get_dir_color(dir) {
        if (this.colors[dir]) {
            return this.colors[dir];
        }
        let obj = App.activeDoc.inspectingTarget;
        return obj.color;
    }
    init_data(obj) {
        // 使用customData
        // 使用ubb数据
        // 使用文本颜色
        // this.check_vertical.selected = false
        // this.check_horizontal.selected = false
        this.colors = {};
        this.gradient_text = "";
        let customData = obj.GetProperty("customData");
        let customDataObj = null;
        if (customData != null && customData != "") {
            try {
                customDataObj = JSON.parse(obj.customData);
            }
            catch (error) {
                console.log("json error:", error);
            }
        }
        if (!customDataObj || !customDataObj.gradient) {
            this.check_vertical.selected = false;
            this.check_horizontal.selected = false;
            return;
        }
        this.gradient_text = customDataObj.gradient;
        let reg = /(#\w+)/g;
        let r;
        let i = 0;
        while (r = reg.exec(this.gradient_text)) {
            let color_hex = r[1];
            let dir = this.dirs[i];
            this.colors[dir] = csharp_1.FairyEditor.ColorUtil.FromHexString(color_hex);
            this.inputs[dir].colorValue = this.colors[dir];
            i++;
        }
        // 顺序为 左上角、左下角、右上角、右下角
        let color_left_up = csharp_1.FairyEditor.ColorUtil.ToHexString(this.colors[GradientDir.up]);
        let color_left_down = csharp_1.FairyEditor.ColorUtil.ToHexString(this.colors[GradientDir.left]);
        let color_right_up = csharp_1.FairyEditor.ColorUtil.ToHexString(this.colors[GradientDir.right]);
        let color_right_down = csharp_1.FairyEditor.ColorUtil.ToHexString(this.colors[GradientDir.down]);
        if (color_left_up == color_right_up && color_left_down == color_right_down) {
            this.check_horizontal.selected = false;
        }
        else {
            this.check_horizontal.selected = true;
        }
        if (color_left_up == color_left_down && color_right_up == color_right_down) {
            this.check_vertical.selected = false;
        }
        else {
            this.check_vertical.selected = true;
        }
    }
}
//Register a inspector
App.inspectorView.AddInspector(() => new GradientColorInspector(), "GradientColorJS", "渐变");
//Condition to show it
App.docFactory.ConnectInspector("GradientColorJS", "mixed", false, false);

import { FairyGUI, FairyEditor, UnityEngine, System } from 'csharp';
const puerts_1 = require("puerts");

const App = FairyEditor.App;

App.pluginManager.LoadUIPackage(App.pluginManager.basePath + "/" + eval("__dirname") + '/CustomInspector')

enum GradientDir {
    up = "up",
    down = "down",
    left = "left",
    right = "right",
}

class GradientColorInspector extends FairyEditor.View.PluginInspector {
    private check_vertical: FairyGUI.GButton;
    private check_horizontal: FairyGUI.GButton;
    private ctrl_vertical: FairyGUI.Controller;
    private ctrl_horizontal: FairyGUI.Controller;
    private inputs: { [key: string]: FairyEditor.Component.ColorInput } = {};
    private colors: { [key: string]: UnityEngine.Color } = {};
    private last_obj: FairyEditor.FObject;
    private readonly dirs = [GradientDir.up, GradientDir.left, GradientDir.right, GradientDir.down]
    private gradient_text: string;
    private readonly allowObjectTypes = ["text", "richtext", "inputtext", "Button", "Label"];
    private color32List: System.Collections.Generic.List$1<UnityEngine.Color32>;

    public constructor() {
        super();
        
        let List = puerts_1.$generic(System.Collections.Generic.List$1, UnityEngine.Color32);
        this.color32List = new List();
        this.panel = FairyGUI.UIPackage.CreateObject("CustomInspector", "GradientColor").asCom;
        this.ctrl_vertical = this.panel.GetController("vertical");
        this.ctrl_horizontal = this.panel.GetController("horizontal");
        for (const key in this.dirs) {
            let dir = this.dirs[key]
            let n = this.panel.GetChild(dir) as FairyGUI.GComponent
            let input = n.GetChild("color") as FairyEditor.Component.ColorInput
            this.inputs[dir] = input;
            input.AddEventListener(FairyEditor.FEvents.SUBMIT, (context: FairyGUI.EventContext) => {
                console.log(dir, input.colorValue);
                this.set_color(dir, input.colorValue);
            })
        }

        this.check_vertical = this.panel.GetChild("check_vertical").asButton;
        this.check_vertical.selected = false
        this.check_vertical.onChanged.Add(() => {
            let obj = App.activeDoc.inspectingTarget
            let color = this.get_object_color(obj);
            if (!this.colors[GradientDir.up]) {
                this.init_dir_color(GradientDir.up, color);
            }
            if (!this.colors[GradientDir.down]) {
                this.init_dir_color(GradientDir.down, color);
            }

            this.update_colors()
        });
        this.check_horizontal = this.panel.GetChild("check_horizontal").asButton;
        this.check_horizontal.selected = false
        this.check_horizontal.onChanged.Add(() => {
            if (this.check_horizontal.selected) {
                let obj = App.activeDoc.inspectingTarget
                let color = this.get_object_color(obj);
                if (!this.colors[GradientDir.left]) {
                    this.init_dir_color(GradientDir.left, color);
                }
                if (!this.colors[GradientDir.right]) {
                    this.init_dir_color(GradientDir.right, color);
                }
            }
            this.update_colors()
        });

        this.updateAction = () => { return this.update_colors(); };
    }

    private get_text_field(gObject: FairyEditor.FObject): FairyEditor.FTextField {
        if (gObject.objectType != "component") {
            return gObject as FairyEditor.FTextField;
        }
        
        let gComponent = gObject as FairyEditor.FComponent;

        let gButton = gComponent.extention as FairyEditor.FButton;
        if (gButton != null) {
            console.log("gButton");
            return gButton.GetTextField();
        }

        let gLabel = gComponent.extention as FairyEditor.FLabel;
        if (gLabel != null) {
            console.log("gLabel");
            return gLabel.GetTextField();
        }

        return null;
    }

    private get_object_color(gObject: FairyEditor.FObject): UnityEngine.Color {
        let inputField = this.get_text_field(gObject);
        return inputField != null ? inputField.color : new UnityEngine.Color(1.0, 1.0, 1.0, 1.0);
    }

    private init_dir_color(dir: GradientDir, color: UnityEngine.Color) {
        this.colors[dir] = color;
        this.inputs[dir].colorValue = color
    }

    private update_colors(): boolean {
        let obj = App.activeDoc.inspectingTarget as FairyEditor.FObject;

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
        } else {
            this.update_color(obj, false);
        }


        return true; //if everything is ok, return false to hide the inspector
    }

    private set_color(dir: GradientDir, color: UnityEngine.Color) {
        if (this.colors[dir] == color) return;
        this.colors[dir] = color;
        this.update_colors()
    }

    private update_color(obj: FairyEditor.FObject, force: boolean) {
        let color = this.get_color_text()
        if (this.gradient_text == color) {
            if (!force) {
                return;
            }
        } else {
            this.gradient_text = color;

            let customData = obj.GetProperty("customData");
            let customDataObj = null;
    
            if (customData != null && customData != "") {
                try {
                    customDataObj = JSON.parse(obj.customData)
                } catch (error) {
                    console.log("json error:", error)
                    customDataObj = {};
                }
            } else {
                customDataObj = {};
            }
    
            if (color.length > 0) {
                customDataObj["gradient"] = color
            } else {
                delete customDataObj["gradient"]
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

        // ????????????????????????textFormat ????????????????????????????????????
        let text = textField.text;
        textField.text = "";
        textField.text = text;
    }

    // ??????????????????
    private getObjectTypeName(gObject: FairyEditor.FObject): string {
        let gComponent = gObject as FairyEditor.FComponent;
        if (gComponent != null && gComponent.extention != null) {
            return gComponent.extention._type;
        }

        return gObject.objectType;
    }

    private get_color32_array(): System.Array$1<UnityEngine.Color32> {
        if (!this.check_vertical.selected && !this.check_horizontal.selected) {
            return null;
        }
            
        this.color32List.Clear();

        if (this.check_vertical.selected) {
            if (this.check_horizontal.selected) {
                this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.up))); // ?????????
                this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.left))); // ?????????
                this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.right))); // ?????????
                this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.down))); // ?????????
            } else {
                this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.up)));
                this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.down)));
                this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.up)));
                this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.down)));
            }
        } else if (this.check_horizontal.selected) {
            this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.left)));
            this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.left)));
            this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.right)));
            this.color32List.Add(this.get_color_32(this.get_dir_color(GradientDir.right)));
        }

        return this.color32List.ToArray();
    }

    private get_color_text(): string {
        if (!this.check_vertical.selected && !this.check_horizontal.selected) return "";
        let s = ""

        if (this.check_vertical.selected) {
            if (this.check_horizontal.selected) {
                s += FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.up)) // ?????????
                s += "," + FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.left)) // ?????????
                s += "," + FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.right)) // ?????????
                s += "," + FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.down)) // ?????????
            } else {
                s += FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.up))
                s += "," + FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.down))
                s += "," + FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.up))
                s += "," + FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.down))
            }
        } else if (this.check_horizontal.selected) {
            s += FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.left))
            s += "," + FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.left))
            s += "," + FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.right))
            s += "," + FairyEditor.ColorUtil.ToHexString(this.get_dir_color(GradientDir.right))
        }

        return s;
    }

    private get_color_32(c: UnityEngine.Color): UnityEngine.Color32 {
        let color32 = new UnityEngine.Color32();
        color32.r = UnityEngine.Mathf.Round(UnityEngine.Mathf.Clamp01(c.r) * 255.0);
        color32.g = UnityEngine.Mathf.Round(UnityEngine.Mathf.Clamp01(c.g) * 255.0);
        color32.b = UnityEngine.Mathf.Round(UnityEngine.Mathf.Clamp01(c.b) * 255.0);
        color32.a = UnityEngine.Mathf.Round(UnityEngine.Mathf.Clamp01(c.a) * 255.0);

        return color32;
    }

    private get_dir_color(dir: GradientDir): UnityEngine.Color {
        if (this.colors[dir]) {
            return this.colors[dir]
        }
        let obj = App.activeDoc.inspectingTarget as FairyEditor.FTextField;
        return obj.color
    }

    private init_data(obj: FairyEditor.FObject) {
        // ??????customData
        // ??????ubb??????
        // ??????????????????
        // this.check_vertical.selected = false
        // this.check_horizontal.selected = false
        this.colors = {}
        this.gradient_text = ""
        let customData = obj.GetProperty("customData");
        let customDataObj = null;

        if (customData != null && customData != "") {
            try {
                customDataObj = JSON.parse(obj.customData)
            } catch (error) {
                console.log("json error:", error)
            }
        }

        if (!customDataObj || !customDataObj.gradient) {
            this.check_vertical.selected = false;
            this.check_horizontal.selected = false;
            return;
        }

        this.gradient_text = customDataObj.gradient;

        let reg = /(#\w+)/g
        let r: RegExpExecArray | null;
        let i = 0
        while (r = reg.exec(this.gradient_text)) {
            let color_hex = r[1];
            let dir = this.dirs[i]
            this.colors[dir] = FairyEditor.ColorUtil.FromHexString(color_hex)
            this.inputs[dir].colorValue = this.colors[dir]
            i++
        }

        // ????????? ?????????????????????????????????????????????
        let color_left_up = FairyEditor.ColorUtil.ToHexString(this.colors[GradientDir.up]);
        let color_left_down = FairyEditor.ColorUtil.ToHexString(this.colors[GradientDir.left]);
        let color_right_up = FairyEditor.ColorUtil.ToHexString(this.colors[GradientDir.right]);
        let color_right_down = FairyEditor.ColorUtil.ToHexString(this.colors[GradientDir.down]);

        if (color_left_up == color_right_up && color_left_down == color_right_down) {
            this.check_horizontal.selected = false;
        } else {
            this.check_horizontal.selected = true;
        }

        if (color_left_up == color_left_down && color_right_up == color_right_down) {
            this.check_vertical.selected = false;
        } else {
            this.check_vertical.selected = true;
        }
    }
}

//Register a inspector
App.inspectorView.AddInspector(() => new GradientColorInspector(), "GradientColorJS", "??????");
//Condition to show it
App.docFactory.ConnectInspector("GradientColorJS", "mixed", false, false);
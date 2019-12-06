function accessProps(obj) {
    obj.saveProps = function() {
        if (this._propsStack === undefined)
            this._propsStack = [];
        this._propsStack.push(clone(this.props));
    }

    obj.restoreProps = function() {
        if (this._propsStack)
            this.cloneProps(this._propsStack.pop());
    }

    obj.cloneProps = function(src) {
        for (let key in this.props) {
            let value = clone(src[key]);
            if (typeof value == 'string')
                value += ':0';
            else if (! Array.isArray(value) && typeof value == 'object')
                for (let k in value)
                    if (typeof value[k] == 'string')
                        value[k] += ':0';
            this.props[key] = value;
        }
    }

    obj.prop = function(name, returnName) {
        if (typeof this.props != 'object')
            return 0;

        let prps = this.props, j, value, index;

        while((j = name.indexOf('.')) > 0) {
            prps = prps[name.substring(0, j)];
            if (prps === undefined)
                return undefined;
            name = name.substring(j+1, name.length);
        }

        let evalFunction = prps['__' + name];
        
        if (evalFunction && typeof evalFunction == 'function')
            return evalFunction();

        value = prps[name];
        if (Array.isArray(value))
            return value[0];

        if (typeof value == 'string') {
            j = value.indexOf(':');
            index = j < 0 ? 0 : parseInt(value.substring(j+1, value.length));
        
            if (! returnName)
                return index;
        
            value = j < 0 ? value : value.substring(0, j);
            return value.split(',')[index];
        }

        if (typeof value == 'object') {
            let result = [];
            for (let key in value)
                if (key.length < 2 || key.substring(0, 2) != '__')
                    result.push(Array.isArray(value[key]) ? value[key][0] : value[key]);
            return result;
        }

        return value;
    }

    obj.setProp = function(id, newValue) {
        if (typeof this.props !== 'object')
            return;

        let setValue = (props, name) => {
            let setNumberValue = (p, v) => p[0] = p.length == 4 ? v - (v % p[3]) : v;
            let value = props[name], j = 0;
            if (newValue === undefined) {
                delete props[name];
            } else if (Array.isArray(value) && typeof newValue == 'number') {
                setNumberValue(props[name], newValue);
            } else if (typeof value == 'object' && Array.isArray(newValue)) {
                for (let key in value)
                    setNumberValue(value[key], newValue[j++]);
            } else if (typeof value != 'string') {
                props[name] = newValue;
                if (typeof newValue == 'string' && newValue.indexOf(':') < 0)
                    props[name] += ':0';
            } else if (typeof newValue == 'string') {
                let j = (value + ':').indexOf(':');
                let s = value.substring(0, j);
                if ((j = getIndex(s.split(','), newValue)) >= 0)
                    props[name] = s + ':' + j;
            } else {
                props[name] = (j = value.indexOf(':')) < 0 ? props[name] + ':' + newValue : value.substring(0, j+1) + newValue;
            }
        }

        let props = this.props;
        for (let i ; (i = id.indexOf('.')) >= 0 ; ) {
            let prefix = id.substring(0, i);
            props = def(props[prefix], {});
            id = id.substring(i + 1, id.length);
        }
        setValue(props, id);

        return obj;
    }
}
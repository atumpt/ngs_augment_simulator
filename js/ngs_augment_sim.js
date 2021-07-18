import {Loadout} from './loadout.js';

var max_class_level = 20,
max_weapon_level = 40,
max_unit_level = 40,
max_weapon_prefix_level = 5,
max_unit_prefix_level = 5,
max_potential_level = 4,
compress,
classes,
weapon_types,
weapon_series,
weapon_prefixes,
weapons,
classes,
elements,
augments,
units,
mainclass,
mainclass_level,
subclass,
subclass_level,
unit_prefixes,
weapon,
weapon_augments,
weapon_level,
weapon_prefix,
weapon_prefix_level,
potential_name,
potential_level,
equipped_units,
equipped_unit_augments,
equipped_unit_levels,
equipped_unit_prefixes,
equipped_unit_prefix_levels,
stats,
stat_sources,
sync_augments,
weapon_enabled,
units_enabled = [],
enemy_stats,
damage_modifiers
;

function stackStat(current, extra, type) {
    if (type == "additive") {
        return current + extra;
    } else {
        return current * (1 + extra / 100);
    }
}

function calculateStats(loadout) {    
    let calculated_stats = {};
    for (const stat_key in stats) {
        if (Object.hasOwnProperty.call(stats, stat_key)) {
            const stat = stats[stat_key];
            let value = stat.base ? stat.base : stat.stacking == 'additive' ? 0 : 1;
            if (classes[loadout.mainclass].stats.hasOwnProperty(stat_key)) {
                value = stackStat(value, classes[loadout.mainclass].stats[stat_key][loadout.mainclass_level - 1], stat.stacking);
            }
            if (loadout.weapon_enabled) {                
                if( loadout.weapon != 'empty' && weapon_series[weapons[loadout.weapon].series].stats.hasOwnProperty(stat_key)) {
                    if (Array.isArray(weapon_series[weapons[loadout.weapon].series].stats[stat_key])) {
                        value = stackStat(value, weapon_series[weapons[loadout.weapon].series].stats[stat_key][loadout.weapon_level], stat.stacking);
                    } else {
                        value = stackStat(value, weapon_series[weapons[loadout.weapon].series].stats[stat_key], stat.stacking);
                    }
                }
                if (loadout.weapon != 'empty' && weapon_series[weapons[loadout.weapon].series].potential.stats.hasOwnProperty(stat_key)) {
                    let potential_value;
                    if (Array.isArray(weapon_series[weapons[loadout.weapon].series].potential.stats[stat_key])) {
                        potential_value = weapon_series[weapons[loadout.weapon].series].potential.stats[stat_key][loadout.potential_level];
                    } else {
                        potential_value = weapon_series[weapons[loadout.weapon].series].potential.stats[stat_key];
                    }
                    if (weapon_series[weapons[loadout.weapon].series].potential.hasOwnProperty('stat_scales') && weapon_series[weapons[loadout.weapon].series].potential.stat_scales.hasOwnProperty(stat_key)) {
                        potential_value = potential_value * Number.parseFloat(calculated_stats[weapon_series[weapons[loadout.weapon].series].potential.stat_scales[stat_key].stat].innerHTML) / weapon_series[weapons[loadout.weapon].series].potential.stat_scales[stat_key].limit
                    }
                    value = stackStat(value, potential_value, stat.stacking);
                }
                if (loadout.weapon_prefix != 'empty' && weapon_prefixes[loadout.weapon_prefix].stats.hasOwnProperty(stat_key)) {
                    if (Array.isArray(weapon_prefixes[loadout.weapon_prefix].stats[stat_key])) {
                        value = stackStat(value, weapon_prefixes[loadout.weapon_prefix].stats[stat_key][loadout.weapon_prefix_level], stat.stacking);
                    } else {
                        value = stackStat(value, weapon_prefixes[loadout.weapon_prefix].stats[stat_key], stat.stacking);
                    }
                }                
                for (let augment_index = 0; augment_index < 4; augment_index++) {
                    const augment = loadout.weapon_augments[augment_index];
                    if (augment.disabled != true && augment != 'empty' && augments[augment].stats.hasOwnProperty(stat_key)) {
                        value = stackStat(value, augments[augment].stats[stat_key], stat.stacking);
                    }
                }
            }
            for (let unit_index = 0; unit_index < loadout.units.length; unit_index++) {
                if (!units_enabled[unit_index].checked) {
                    continue;
                }
                const unit = loadout.units[unit_index];
                const unit_level = loadout.unit_levels[unit_index];
                const unit_prefix = loadout.unit_prefixes[unit_index];
                const unit_prefix_level = loadout.unit_prefix_levels[unit_index];
                const unit_augments = loadout.unit_augments[unit_index];
                if (unit != 'empty' && units[unit].stats.hasOwnProperty(stat_key)) {
                    if (Array.isArray(units[unit].stats[stat_key])) {
                        value = stackStat(value, units[unit].stats[stat_key][unit_level], stat.stacking);
                    } else {
                        value = stackStat(value, units[unit].stats[stat_key], stat.stacking);
                    }
                }
                if (unit_prefix != 'empty' && unit_prefixes[unit_prefix].stats.hasOwnProperty(stat_key)) {
                    if (Array.isArray(unit_prefixes[unit_prefix].stats[stat_key])) {
                        value = stackStat(value, unit_prefixes[unit_prefix].stats[stat_key][unit_prefix_level], stat.stacking);
                    } else {
                        value = stackStat(value, unit_prefixes[unit_prefix].stats[stat_key], stat.stacking);
                    }
                }
                for (let augment_index = 0; augment_index < unit_augments.length; augment_index++) {
                    const augment = unit_augments[augment_index];
                    if (augment.disabled != true && augment != 'empty' && augments[augment].stats.hasOwnProperty(stat_key)) {
                        value = stackStat(value, augments[augment].stats[stat_key], stat.stacking);
                    }
                }
            }
            if (Object.hasOwnProperty.call(loadout.food_stats, stat_key)) {
                value = stackStat(value, loadout.food_stats[stat_key], stat.stacking);
            }

            if (stat.hasOwnProperty('affected_by') && stats.hasOwnProperty(stat.affected_by)) {
                value = stackStat(value, calculated_stats[stat.affected_by] - stats[stat.affected_by].base, stat.stacking);
            }
            calculated_stats[stat_key] = value;
        }
    }
    return calculated_stats;
}

function setStats() {
    const active_loadout = inputToLoadout();
    const calculated_stats = calculateStats(active_loadout);
    for (const stat_key in calculated_stats) {
        if (Object.hasOwnProperty.call(stats, stat_key) && document.getElementById("total_" + stat_key) != null) {
            const value = calculated_stats[stat_key];
            const stat = stats[stat_key];
            if (stat.hasOwnProperty('display_subtract')) {
                const display_value = value - stat.display_subtract;
                document.getElementById("total_" + stat_key).innerHTML = display_value.toPrecision(14).replace(/\.0+$/, '');
                if (display_value >=0 ) {
                    document.getElementById("total_" + stat_key).innerHTML = '+' + document.getElementById("total_" + stat_key).innerHTML;
                }
            } else {
                document.getElementById("total_" + stat_key).innerHTML = value.toPrecision(14).replace(/\.0+$/, '');
            }
        }
    }
    if (weapon.value != 'empty' && classes[active_loadout.mainclass].weapon_types.indexOf(weapons[active_loadout.weapon].type) == -1) {
        weapon.classList.add('invalid');
        weapon.title = 'This is not a main class weapon. You will not get the 10% main class weapon bonus.';
    } else {
        weapon.classList.remove('invalid');
        weapon.title = '';
    }
    const base_attack = classes[active_loadout.mainclass].stats.attack[active_loadout.mainclass_level -1 ];
    const weapon_attack = weapon.value != 'empty' ? weapon_series[weapons[weapon.value].series].stats.attack[weapon_level.value] : 0;
    document.querySelectorAll('.attack_row').forEach((e) => {
        const weapon_type = weapon.value != 'empty' ? weapons[weapon.value].type : 'none';
        const weapon_potency = weapon.value != 'empty' ? calculated_stats[weapon_types[weapon_type].damage_type + "_weapon_potency"] : calculated_stats["potency"];
        const attack_potency = parseFloat(e.querySelector('.attack_potency').value);
        let enemy_defense = Math.floor(parseFloat(e.querySelector('.enemy_defense').value));
        let damage_multiplier = 1;
        const active_damage_modifiers = [];
        e.querySelectorAll('input[data-damage-modifier]:checked').forEach((modifier) => active_damage_modifiers.push(modifier.getAttribute('data-damage-modifier')));
        for (const damage_modifier_name of active_damage_modifiers) {
            if (damage_modifiers.hasOwnProperty(damage_modifier_name)) {
                const modifier = damage_modifiers[damage_modifier_name];
                if (modifier.hasOwnProperty("enhanced_by")) {
                    for (const enhanced_by in modifier.enhanced_by) {
                        if (active_damage_modifiers.indexOf(enhanced_by) > -1) {
                            damage_multiplier *= modifier.enhanced_by[enhanced_by].stats.potency;
                        }
                    }
                }
                if (modifier.hasOwnProperty("overwrites")) {
                    if (active_damage_modifiers.indexOf(modifier.overwrites) > -1 && damage_modifiers.hasOwnProperty(modifier.overwrites)) {
                        damage_multiplier /= damage_modifiers[modifier.overwrites].stats.potency;
                    }
                } 
                if (modifier.stats.hasOwnProperty('potency')) {
                    damage_multiplier *= modifier.stats.potency;
                }
                if (modifier.stats.hasOwnProperty('enemy_defense')) {
                    enemy_defense *= modifier.stats.enemy_defense;
                }
            }
        }
        if (active_damage_modifiers.indexOf('custom') > -1) {
            const custom_modifier = parseFloat(e.querySelector('input[data-damage-modifier=custom_value]').value);
            if (!isNaN(custom_modifier)) {
                damage_multiplier *= custom_modifier;
            }
        }
        if (active_damage_modifiers.indexOf('weakpoint') > -1) {
            damage_multiplier *= calculated_stats['weakpoint_potency'] / 100;
        }
        if (weapon.value!= 'empty' && weapon_series[weapons[weapon.value].series].element != 'none') {
             if(e.querySelector('.enemy_element').value == weapon_series[weapons[weapon.value].series].element) {
                damage_multiplier *= 1.15;
             } else {
                damage_multiplier *= 1.1;
             }
        }
        const total_potency = attack_potency / 100 * weapon_potency / 100 * (classes[mainclass.value].weapon_types.indexOf(weapon_type) != -1 ? 1.1 : 1) * damage_multiplier;
        const minimum_damage = (base_attack + (weapon_attack * calculated_stats["potency_floor"] / 100) - enemy_defense) / 5* total_potency;
        const maximum_damage = (base_attack + (weapon_attack) - enemy_defense) / 5 * total_potency;
        const critical_damage = maximum_damage*calculated_stats['critical_hit_potency']/100; //Math.floor(calculated_stats['critical_hit_potency'] / 100 * Math.ceil(maximum_damage));
        const average_damage = ((minimum_damage + maximum_damage) / 2) * (1 - (calculated_stats['critical_hit_rate'] / 100)) + (critical_damage * (calculated_stats['critical_hit_rate'] / 100));
        e.querySelector('.total_potency').innerHTML = total_potency.toPrecision(4);
        e.querySelector('.minimum_damage').innerHTML = minimum_damage.toPrecision(4);
        e.querySelector('.maximum_damage').innerHTML = maximum_damage.toPrecision(4);
        e.querySelector('.critical_damage').innerHTML = critical_damage.toPrecision(4);
        e.querySelector('.average_damage').innerHTML = average_damage.toPrecision(4);
    })
    const average_attack_power = weapon_attack * (200 +(weapon.value != 'empty' ? weapon_series[weapons[weapon.value].series].stats.potency_floor : -200))/ 100 / 2;
    // unit contributions seem to be calculated invidually, floored, and then added to the total.
    let unit_hp = 0, unit_pp = 0, unit_armor = 0;
    for (let unit_index = 0; unit_index < equipped_units.length; unit_index++) {
        const unit = equipped_units[unit_index];
        if (unit.value == "empty" || units_enabled[unit_index].checked == false) {
            continue;
        }
        if (units[unit.value].stats.hasOwnProperty('hp')) {
            unit_hp += Math.floor(units[unit.value].stats.hp) / 10;
        }
        if (units[unit.value].stats.hasOwnProperty('pp')) {
            unit_pp += units[unit.value].stats.pp;
        }
        unit_armor += Math.floor(units[unit.value].stats.defense[equipped_unit_levels[unit_index].value] / 2);
    }
    let battlepower = calculated_stats["bp"] + 
                      Math.floor(average_attack_power) + 
                      base_attack +
                      unit_armor + 
                      Math.floor(classes[mainclass.value].stats.defense[mainclass_level.value-1] / 2) +
                      unit_hp +
                      unit_pp +
                      potential_level.value * 10 +
                      120; // Skill points. Assumes 20 points in main and sub class.
    document.getElementById("total_bp").innerHTML = Math.floor(battlepower);
}

function loadUnits() {
    let options = '<option value="empty" selected="selected">Empty</option>';
    for (const unit_key in units) {
        if(units.hasOwnProperty(unit_key)) {
            options += '<option' + ' value="' + unit_key  + '">' + units[unit_key].name + '</option>';
        }
    }
    document.getElementById('unit_1').innerHTML = options;
    document.getElementById('unit_2').innerHTML = options;
    document.getElementById('unit_3').innerHTML = options;
}

function loadClassLevels() {
    let options = '<option value="' + max_class_level + '" selected="selected">' + max_class_level + '</option>';
    for (let index = max_class_level - 1; index >= 0; index--) {
        options += '<option value="' + index + '">' + index + '</option>';
    }
    mainclass_level.innerHTML = options;
    subclass_level.innerHTML = options;
}
function loadWeaponLevels() {
    let options = '<option value="' + max_weapon_level + '" selected="selected">' + max_weapon_level + '</option>';
    for (let index = max_weapon_level - 1; index >= 0; index--) {
        options += '<option value="' + index + '">' + index + '</option>';
    }
    weapon_level.innerHTML = options;
}
function loadUnitLevels() {
    let options = '<option value="' + max_unit_level + '" selected="selected">' + max_unit_level + '</option>';
    for (let index = max_unit_level - 1; index > 0; index--) {
        options += '<option value="' + index + '">' + index + '</option>';
    }
    for (const unit_level of equipped_unit_levels) {        
        unit_level.innerHTML = options;
    }
}
function loadWeaponPrefixLevels() {
    let options = '<option value="' + max_weapon_prefix_level + '" selected="selected">' + max_weapon_prefix_level + '</option>';
    for (let index = max_weapon_prefix_level - 1; index > 0; index--) {
        options += '<option value="' + index + '">' + index + '</option>';
    }
    weapon_prefix_level.innerHTML = options;
}
function loadUnitPrefixLevels() {
    let options = '<option value="' + max_unit_prefix_level + '" selected="selected">' + max_unit_prefix_level + '</option>';
    for (let index = max_unit_prefix_level - 1; index > 0; index--) {
        options += '<option value="' + index + '">' + index + '</option>';
    }
    for (const unit_prefix_level of equipped_unit_prefix_levels) {
        unit_prefix_level.innerHTML = options;
    }
}
function loadPotentialLevels() {
    let options = '<option value="' + max_potential_level + '" selected="selected">' + max_potential_level + '</option>';
    for (let index = max_potential_level - 1; index >= 0; index--) {
        options += '<option value="' + index + '">' + index + '</option>';
    }
    potential_level.innerHTML = options;
}

function loadEnemyLevels() {
    let levels = ''
    for (let level_index = 0; level_index < enemy_stats.length; level_index++) {
        const level = enemy_stats[level_index];
        levels += '<option value="' + level.defense + '">' + 'Level ' + level.level + ': ' + level.defense + '</option>';
    }
    document.querySelectorAll('.enemy_defense').forEach((e) => e.innerHTML = levels);
}

function loadEnemyElements() {
    let element_options = ''
    for (const element_key in elements) {
        if (Object.hasOwnProperty.call(elements, element_key)) {
            const element = elements[element_key];
            element_options += '<option value="' + element_key + '">' + element.name + '</option>';
            
        }
    }
    document.querySelectorAll('.enemy_element').forEach((e) => e.innerHTML = element_options);
}

function loadLevels() {
    loadClassLevels();
    loadWeaponLevels();
    loadUnitLevels();
    loadWeaponPrefixLevels();
    loadUnitPrefixLevels();
    loadPotentialLevels();
    loadEnemyLevels();
    loadEnemyElements();
}

function loadAugments() {
    let options = '<option value="empty" selected="selected">Empty</option>';
    for (const augment_key in augments) {
        if (augments.hasOwnProperty(augment_key)) {
            options += '<option' + ' value="' + augment_key + '" data-group="' + augments[augment_key].group + '">' + augments[augment_key].name + '</option>';
        }
    }
    for (let index = 1; index <= 4; index++) {
        document.getElementById('weapon_augment_' + index).innerHTML = options;
        document.getElementById('unit_1_augment_' + index).innerHTML = options;
        document.getElementById('unit_2_augment_' + index).innerHTML = options;
        document.getElementById('unit_3_augment_' + index).innerHTML = options;
    }
}

function loadWeapons() {
    let options = '<option value="empty" selected="selected">Empty</option>';
    for (const weapon_key in weapons) {
        if(weapons.hasOwnProperty(weapon_key)) {
            options += '<option' + ' value="' + weapon_key  + '">' + weapons[weapon_key].name + '</option>';
        }
    }
    document.getElementById('weapon').innerHTML = options;
}

function loadWeaponPrefixes() {
    let options = '<option value="empty" selected="selected">Empty</option>';
    for (const weapon_prefix_key in weapon_prefixes) {
        if(weapon_prefixes.hasOwnProperty(weapon_prefix_key)) {
            options += '<option' + ' value="' + weapon_prefix_key  + '">' + weapon_prefixes[weapon_prefix_key].name + '</option>';
        }
    }
    document.getElementById('weapon_prefix').innerHTML = options;
}

function loadUnitPrefixes() {
    let options = '<option value="empty" selected="selected">Empty</option>';
    for (const unit_prefix_key in unit_prefixes) {
        if(unit_prefixes.hasOwnProperty(unit_prefix_key)) {
            options += '<option' + ' value="' + unit_prefix_key  + '">' + unit_prefixes[unit_prefix_key].name + '</option>';
        }
    }
    document.getElementById('unit_1_prefix').innerHTML = options;
    document.getElementById('unit_2_prefix').innerHTML = options;
    document.getElementById('unit_3_prefix').innerHTML = options;
}

function loadClasses() {
    let options = '';
    for (const class_key in classes) {
        if(classes.hasOwnProperty(class_key)) {
            options += '<option' + ' value="' + class_key  + '">' + classes[class_key].name + '</option>';
        }
    }
    mainclass.innerHTML = options;
    subclass.innerHTML = options.replace(/(hunter)(.*)(fighter)/, '$3$2$1').replace(/(Hunter)(.*)(Fighter)/, '$3$2$1');
}

function onChangeClass() {
    if (mainclass.value == subclass.value) {
        subclass.classList.add('invalid');
        subclass.title = 'You cannot use your mainclass as your subclass';
    } else {
        subclass.classList.remove('invalid');
        subclass.title = '';
    }
}

function onChangeWeapon() {
    setStats();
    if (weapon.value != 'empty'){
        potential_name.innerHTML = weapon_series[weapons[weapon.value].series].potential.name;
    }
}

function onChangeWeaponLevel() {
    if (weapon_level.value < 40) {
        weapon_augments[3].disabled = true;
        weapon_augments[3].title = 'Enhance to +40 to unlock this augment slot';
    } else {
        weapon_augments[3].disabled = false;
        weapon_augments[3].title = '';
    }
    if (weapon_level.value < 20) {
        weapon_augments[2].disabled = true;
        weapon_augments[2].title = 'Enhance to +20 to unlock this augment slot';
    } else {
        weapon_augments[2].disabled = false;
        weapon_augments[2].title = '';
    }
}

function onChangeUnitLevel(e) {
    let index = parseInt(e.target.id.split('_')[1])-1;
    if (equipped_unit_levels[index].value < 40) {
        equipped_unit_augments[index][3].disabled = true;
        equipped_unit_augments[index][3].title = 'Enhance to +40 to unlock this augment slot';
    } else {
        equipped_unit_augments[index][3].disabled = false;
        equipped_unit_augments[index][3].title = '';
    }
    if (equipped_unit_levels[index].value < 20) {
        equipped_unit_augments[index][2].disabled = true;
        equipped_unit_augments[index][2].title = 'Enhance to +20 to unlock this augment slot';
    } else {
        equipped_unit_augments[index][2].disabled = false;
        equipped_unit_augments[index][2].title = '';
    }
}

function validateAugmentRestrictions(augment, group) {
    //Validate augment restrictions
    document.querySelectorAll('option[data-conflict=' + augment.id + ']').forEach((opt) => {
        opt.disabled = false;
        opt.title = '';
    });
    for (let augment_index = 0; augment_index < group.length; augment_index++) {
        if (augment.value != 'empty' && augment.id != group[augment_index].id && augment.value == group[augment_index].value) {
            augment.classList.add('invalid');
            augment.title = 'Duplicate augment';
            break;
        } else {
            if (augment.value != 'empty' && augment.id != group[augment_index].id && augments[augment.value].group == augments[group[augment_index].value].group) {
                augment.classList.add('invalid');
                augment.title = "Augment can't be slotted with " + augments[group[augment_index].value].name;
                break;
            } else {
                augment.classList.remove('invalid');
                augment.title = '';
                if (augment.id != group[augment_index].id) {
                    group[augment_index].querySelectorAll('option[data-group="' + augments[augment.value].group + '"]').forEach((opt) => {
                        opt.disabled = true;
                        opt.title = "Augment can't be slotted with " + augments[augment.value].name;
                        opt.setAttribute('data-conflict', augment.id);
                    });
                }
            }
        }
    }
}

function synchronize_augment_selection(selected_augment) {
    const id_split = selected_augment.id.split('_');
    let augment_index = parseInt(id_split[id_split.length-1]) - 1;
    //Synchronize unit augments
    for (let unit_index = 0; unit_index < equipped_unit_augments.length; unit_index++) {
        if (equipped_unit_augments[unit_index][augment_index].value != selected_augment.value) {
            equipped_unit_augments[unit_index][augment_index].value = selected_augment.value;
            validateAugmentRestrictions(equipped_unit_augments[unit_index][augment_index], equipped_unit_augments[unit_index]);
        }
    }
    //synchronize weapon augments
    if (weapon_augments[augment_index].value != selected_augment.value) {
        weapon_augments[augment_index].value = selected_augment.value;
        validateAugmentRestrictions(weapon_augments[augment_index], weapon_augments);
    }
}

function onChangeWeaponAugment(e) {
    validateAugmentRestrictions(e.target, weapon_augments);
    if (sync_augments.checked) {
        synchronize_augment_selection(e.target);
    }
}

function onChangeUnitAugment(e) {
    let target_unit_index = parseInt(e.target.id.split('_')[1]) - 1;
    validateAugmentRestrictions(e.target, equipped_unit_augments[target_unit_index]);
    if (sync_augments.checked) {
        synchronize_augment_selection(e.target);
    }
}

function load_json_files() {
    const ajax = new XMLHttpRequest();
    ajax.open('GET', 'data/classes.json', false);
    ajax.send();
    classes = JSON.parse(ajax.response);
    ajax.open('GET', 'data/weapon_series.json', false);
    ajax.send();
    weapon_series = JSON.parse(ajax.response);
    ajax.open('GET', 'data/weapon_types.json', false);
    ajax.send();
    weapon_types = JSON.parse(ajax.response);
    ajax.open('GET', 'data/weapon_prefixes.json', false);
    ajax.send();
    weapon_prefixes = JSON.parse(ajax.response);
    ajax.open('GET', 'data/weapons.json', false);
    ajax.send();
    weapons = JSON.parse(ajax.response);
    ajax.open('GET', 'data/classes.json', false);
    ajax.send();
    classes = JSON.parse(ajax.response);
    ajax.open('GET', 'data/elements.json', false);
    ajax.send();
    elements = JSON.parse(ajax.response);
    ajax.open('GET', 'data/augments.json', false);
    ajax.send();
    augments = JSON.parse(ajax.response);
    ajax.open('GET', 'data/units.json', false);
    ajax.send();
    units = JSON.parse(ajax.response);
    ajax.open('GET', 'data/unit_prefixes.json', false);
    ajax.send();
    unit_prefixes = JSON.parse(ajax.response);
    ajax.open('GET', 'data/stats.json', false);
    ajax.send();
    stats = JSON.parse(ajax.response);
    ajax.open('GET', 'data/compress.json', false);
    ajax.send();
    compress = JSON.parse(ajax.response);
    ajax.open('GET', 'data/damage_modifiers.json', false);
    ajax.send();
    damage_modifiers = JSON.parse(ajax.response);
    ajax.open('GET', 'data/damage_modifiers.json', false);
    ajax.send();
    damage_modifiers = JSON.parse(ajax.response);
    
    //restrict to levels 1-24 for now.
    ajax.open('GET', 'data/enemy_stats_1_24.json', false);
    ajax.send();
    enemy_stats = JSON.parse(ajax.response);

}

function objectToArray (obj) {
    const keys = Object.keys(obj);
    const res = [];
    for (let i = 0; i < keys.length; i++) {
        res.push(obj[keys[i]]);
    };
    return res;
};

function arrayToObject(array, object) {
    const keys = Object.keys(object);
    for (let i = 0; i < keys.length; i++) {
        object[keys[i]] = array.hasOwnProperty(i) ? array[i] : object[keys[i]];
    };
    return object
}


function arrayToLoadout (obj) {
    const loadout = new Loadout();
    return arrayToObject(obj, loadout);
};


function inputToLoadout() {
    const loadout = new Loadout();
    loadout.weapon = weapon.value;
    loadout.weapon_level = parseInt(weapon_level.value);
    loadout.weapon_enabled = weapon_enabled.checked;
    loadout.weapon_prefix = weapon_prefix.value;
    loadout.weapon_prefix_level = parseInt(weapon_prefix_level.value);
    loadout.potential_level = parseInt(potential_level.value);
    loadout.units = [];
    for (let unit_index = 0; unit_index < equipped_units.length; unit_index++) {
        loadout.units[unit_index] = equipped_units[unit_index].value;
        loadout.units_enabled[unit_index] = units_enabled[unit_index].checked;
        loadout.unit_levels[unit_index] = parseInt(equipped_unit_levels[unit_index].value);
        loadout.unit_prefixes[unit_index] = equipped_unit_prefixes[unit_index].value;
        loadout.unit_prefix_levels[unit_index] = parseInt(equipped_unit_prefix_levels[unit_index].value);
        loadout.unit_augments[unit_index] = [];
        for (let augment_index = 0; augment_index < equipped_unit_augments[unit_index].length; augment_index++) {
            loadout.unit_augments[unit_index][augment_index] = equipped_unit_augments[unit_index][augment_index].value;
        }
    }
    for (let augment_index = 0; augment_index < weapon_augments.length; augment_index++) {
        loadout.weapon_augments[augment_index] = weapon_augments[augment_index].value;
    }
    loadout.mainclass = mainclass.value;
    loadout.mainclass_level = parseInt(mainclass_level.value);
    loadout.subclass = subclass.value;
    loadout.subclass_level = parseInt(subclass_level.value);
    loadout.units = loadout.units;
    loadout.unit_levels = loadout.unit_levels;
    loadout.unit_prefixes = loadout.unit_prefixes;
    loadout.unit_prefix_levels = loadout.unit_prefix_levels;
    loadout.unit_augments = loadout.unit_augments;
    loadout.weapon_augments = loadout.weapon_augments;
    loadout.food_stats = {
        "hp": parseFloat(document.getElementById('food_hp').value),
        "pp": parseFloat(document.getElementById('food_pp').value),
        "potency": parseFloat(document.getElementById('food_potency').value),
        "weakpoint_potency": parseFloat(document.getElementById('food_weakpoint_potency').value),
    };
    return loadout;
}

function compressLoadout(loadout) {
    const compressed_loadout = new Loadout();
    compressed_loadout.weapon = compress.indexOf(loadout.weapon);
    compressed_loadout.weapon_level = parseInt(loadout.weapon_level);
    compressed_loadout.weapon_enabled = compress.indexOf(loadout.weapon_enabled);
    compressed_loadout.weapon_prefix = compress.indexOf(loadout.weapon_prefix);
    compressed_loadout.weapon_prefix_level = parseInt(loadout.weapon_prefix_level);
    compressed_loadout.potential_level = parseInt(loadout.potential_level);
    compressed_loadout.units = [];
    for (let unit_index = 0; unit_index < loadout.units.length; unit_index++) {
        compressed_loadout.units[unit_index] = compress.indexOf(loadout.units[unit_index]);
        compressed_loadout.units_enabled[unit_index] = compress.indexOf(loadout.units_enabled[unit_index]);
        compressed_loadout.unit_levels[unit_index] = parseInt(loadout.unit_levels[unit_index]);
        compressed_loadout.unit_prefixes[unit_index] = compress.indexOf(loadout.unit_prefixes[unit_index]);
        compressed_loadout.unit_prefix_levels[unit_index] = parseInt(loadout.unit_prefix_levels[unit_index]);
        compressed_loadout.unit_augments[unit_index] = [];
        for (let augment_index = 0; augment_index < loadout.unit_augments[unit_index].length; augment_index++) {
            compressed_loadout.unit_augments[unit_index][augment_index] = compress.indexOf(loadout.unit_augments[unit_index][augment_index]);
        }
    }
    for (let augment_index = 0; augment_index < loadout.weapon_augments.length; augment_index++) {
        compressed_loadout.weapon_augments[augment_index] = compress.indexOf(loadout.weapon_augments[augment_index]);
    }
    compressed_loadout.mainclass = compress.indexOf(loadout.mainclass);
    compressed_loadout.mainclass_level = parseInt(loadout.mainclass_level);
    compressed_loadout.subclass = compress.indexOf(loadout.subclass);
    compressed_loadout.subclass_level = parseInt(loadout.subclass_level);
    compressed_loadout.units = JSON.stringify(compressed_loadout.units);
    compressed_loadout.unit_levels = JSON.stringify(compressed_loadout.unit_levels);
    compressed_loadout.units_enabled = JSON.stringify(compressed_loadout.units_enabled);
    compressed_loadout.unit_prefixes = JSON.stringify(compressed_loadout.unit_prefixes);
    compressed_loadout.unit_prefix_levels = JSON.stringify(compressed_loadout.unit_prefix_levels);
    compressed_loadout.unit_augments = JSON.stringify(compressed_loadout.unit_augments);
    compressed_loadout.weapon_augments = JSON.stringify(compressed_loadout.weapon_augments);
    compressed_loadout.food_stats = JSON.stringify(objectToArray(loadout.food_stats));
    return objectToArray(compressed_loadout).toString().replace(/\[/g, 'o').replace(/\]/g, 'c');
}

function uncompressLoadout(compressed_loadout){ 
    const loadout = new Loadout();
    compressed_loadout = arrayToLoadout(JSON.parse('[' + compressed_loadout.replace(/o/gi, '[').replace(/c/gi, ']') + ']'));
    loadout.weapon = compress[compressed_loadout.weapon]
    loadout.weapon_level = compressed_loadout.weapon_level;
    loadout.weapon_prefix = compress[compressed_loadout.weapon_prefix];
    loadout.weapon_prefix_level = compressed_loadout.weapon_prefix_level;
    loadout.potential_level = compressed_loadout.potential_level;
    for (let unit_index = 0; unit_index < compressed_loadout.units.length; unit_index++) {
        loadout.units[unit_index] = compress[compressed_loadout.units[unit_index]];
        loadout.unit_levels[unit_index] = compressed_loadout.unit_levels[unit_index];
        loadout.unit_prefixes[unit_index] = compress[compressed_loadout.unit_prefixes[unit_index]];
        loadout.unit_prefix_levels[unit_index] = compressed_loadout.unit_prefix_levels[unit_index];
        loadout.unit_augments[unit_index] = [];
        for (let augment_index = 0; augment_index < compressed_loadout.unit_augments[unit_index].length; augment_index++) {
            loadout.unit_augments[unit_index][augment_index] = compress[compressed_loadout.unit_augments[unit_index][augment_index]];
        }
    }
    for (let augment_index = 0; augment_index < compressed_loadout.weapon_augments.length; augment_index++) {
        loadout.weapon_augments[augment_index] = compress[compressed_loadout.weapon_augments[augment_index]];
    }
    loadout.mainclass = compress[compressed_loadout.mainclass];
    loadout.mainclass_level = compressed_loadout.mainclass_level;
    loadout.subclass = compress[compressed_loadout.subclass];
    loadout.subclass_level = compressed_loadout.subclass_level;
    loadout.food_stats = arrayToObject(compressed_loadout.food_stats, loadout.food_stats);
    return loadout;
}

function printLoadout() {
    let loadout = inputToLoadout();
    document.getElementById('loadout').value = compressLoadout(loadout) ;
}

function importLoadout() {
    if (document.getElementById('loadout').value.length == 0) {
        return;
    }
    let loadout = uncompressLoadout(document.getElementById('loadout').value);
    weapon.value = loadout.weapon;
    weapon_level.value = loadout.weapon_level;
    weapon_prefix.value = loadout.weapon_prefix;
    weapon_prefix_level.value = loadout.weapon_prefix_level;
    potential_level.value = loadout.potential_level;
    for (let unit_index = 0; unit_index < loadout.units.length; unit_index++) {
        equipped_units[unit_index].value = loadout.units[unit_index];
        equipped_unit_levels[unit_index].value = loadout.unit_levels[unit_index];
        equipped_unit_prefixes[unit_index].value = loadout.unit_prefixes[unit_index];
        equipped_unit_prefix_levels[unit_index].value = loadout.unit_prefix_levels[unit_index];
        for (let augment_index = 0; augment_index < loadout.unit_augments[unit_index].length; augment_index++) {
            equipped_unit_augments[unit_index][augment_index].value = loadout.unit_augments[unit_index][augment_index];
        }
    }
    for (let augment_index = 0; augment_index < loadout.weapon_augments.length; augment_index++) {
        weapon_augments[augment_index].value = loadout.weapon_augments[augment_index];
    }
    mainclass.value = loadout.mainclass;
    mainclass_level.value = loadout.mainclass_level;
    subclass.value = loadout.subclass;
    subclass_level.value = loadout.subclass_level;
    setStats();
    for (let augment_index = 0; augment_index < weapon_augments.length; augment_index++) {
        validateAugmentRestrictions(weapon_augments[augment_index], weapon_augments);
    }
    for (let unit_index = 0; unit_index < equipped_unit_augments.length; unit_index++) {
        for (let augment_index = 0; augment_index < weapon_augments.length; augment_index++) {
            validateAugmentRestrictions(equipped_unit_augments[unit_index][augment_index], equipped_unit_augments[unit_index]);
        }
    }
    for (const key in loadout.food_stats) {
        if (Object.hasOwnProperty.call(loadout.food_stats, key)) {
            const element = loadout.food_stats[key];
            document.getElementById('food_' + key).value = element;
        }
    }
}

function showLoadouts() {
    let loadout_list = '';
    const loadouts = window.localStorage.getItem('loadouts') != null ? JSON.parse(window.localStorage.getItem('loadouts')) : [];
    for (const loadout of loadouts) {
        loadout_list += '<li data-loadout-name="' + loadout.name + '">' + loadout.name + '<button data-loadout-name="' + loadout.name + '" value="Load">Load</button><button data-loadout-name="' + loadout.name + '" value="Delete">Delete</button></li>';
    }
    document.getElementById('loadout_list').innerHTML = loadout_list;
    document.querySelectorAll('button[data-loadout-name][value="Load"').forEach((e) => e.addEventListener('click', loadLoadout));
    document.querySelectorAll('button[data-loadout-name][value="Delete"').forEach((e) => e.addEventListener('click', deleteLoadout));
    document.getElementById('loadout_container').classList.remove('d-none');
}

function hideLoadouts() {
    document.getElementById('loadout_container').classList.add('d-none');
}

function deleteLoadout(e) {
    const loadout_name = e.target.getAttribute('data-loadout-name');
    const loadouts = window.localStorage.getItem('loadouts') != null ? JSON.parse(window.localStorage.getItem('loadouts')).filter((l) => l.name != loadout_name) : [];
    window.localStorage.setItem('loadouts', JSON.stringify(loadouts)); //Array.isArray(loadouts) ? loadouts : '[]');
    showLoadouts()
}

function loadLoadout(e) {
    const loadout_name =  e.target.getAttribute('data-loadout-name');
    const loadouts = window.localStorage.getItem('loadouts') != null ? JSON.parse(window.localStorage.getItem('loadouts')) : [];
    const loadout = loadouts.find((l) => l.name == loadout_name);
    document.getElementById('loadout').value = loadout.loadout_string;
    document.getElementById('new_loadout_name').value = loadout_name;
    importLoadout();
}

function saveLoadout() {
    const loadout = { "name": document.getElementById('new_loadout_name').value, "loadout_string": document.getElementById('loadout').value};
    const loadouts = window.localStorage.getItem('loadouts') != null ? JSON.parse(window.localStorage.getItem('loadouts')).filter((l) => l.name != loadout.name) : [];
    loadouts.push(loadout);
    window.localStorage.setItem('loadouts', JSON.stringify(loadouts));
    showLoadouts()
}

function exportLoadout() {
    window.location.hash = document.getElementById('loadout').value
    navigator.clipboard.writeText(window.location);
}

function addAttackRow(e) {
    e.target.parentNode.parentNode.parentNode.insertBefore(document.querySelector('.attack_row:nth-last-of-type(2)').cloneNode(true), e.target.parentNode.parentNode);
}

function initialize() {
    mainclass = document.getElementById('mainclass');
    mainclass_level = document.getElementById('mainclass_level');
    subclass = document.getElementById('subclass');
    subclass_level = document.getElementById('subclass_level');
    weapon = document.getElementById('weapon');
    weapon_prefix = document.getElementById('weapon_prefix');
    weapon_enabled = document.getElementById('weapon_enabled');
    weapon_level = document.getElementById('weapon_level');
    weapon_prefix_level = document.getElementById('weapon_prefix_level');
    potential_level = document.getElementById('potential_level');
    potential_name = document.getElementById('potential_name');
    weapon_augments = [
        document.getElementById('weapon_augment_1'),
        document.getElementById('weapon_augment_2'),
        document.getElementById('weapon_augment_3'),
        document.getElementById('weapon_augment_4'),
    ];
    equipped_units = [
        document.getElementById('unit_1'),
        document.getElementById('unit_2'),
        document.getElementById('unit_3'),
    ];
    equipped_unit_augments = [
        [
            document.getElementById('unit_1_augment_1'),
            document.getElementById('unit_1_augment_2'),
            document.getElementById('unit_1_augment_3'),
            document.getElementById('unit_1_augment_4'),
        ],
        [
            document.getElementById('unit_2_augment_1'),
            document.getElementById('unit_2_augment_2'),
            document.getElementById('unit_2_augment_3'),
            document.getElementById('unit_2_augment_4'),
        ],
        [
            document.getElementById('unit_3_augment_1'),
            document.getElementById('unit_3_augment_2'),
            document.getElementById('unit_3_augment_3'),
            document.getElementById('unit_3_augment_4'),
        ]
    ];
    equipped_unit_levels = [
        document.getElementById('unit_1_level'),
        document.getElementById('unit_2_level'),
        document.getElementById('unit_3_level'),
    ];
    units_enabled = [
        document.getElementById('unit_1_enabled'),
        document.getElementById('unit_2_enabled'),
        document.getElementById('unit_3_enabled'),
    ];
    equipped_unit_prefixes = [
        document.getElementById('unit_1_prefix'),
        document.getElementById('unit_2_prefix'),
        document.getElementById('unit_3_prefix'),
    ];
    equipped_unit_prefix_levels = [
        document.getElementById('unit_1_prefix_level'),
        document.getElementById('unit_2_prefix_level'),
        document.getElementById('unit_3_prefix_level'),
    ];
    
    for (let unit_index = 1; unit_index <= 3; unit_index++) {
        document.getElementById('unit_' + unit_index + '_level').addEventListener('change', onChangeUnitLevel);
    }
    for (let augment_index = 1; augment_index <= 4; augment_index++) {
        document.getElementById('weapon_augment_' + augment_index).addEventListener('change', onChangeWeaponAugment);
        for (let unit_index = 1; unit_index <= 3; unit_index++) {
            document.getElementById('unit_' + unit_index + '_augment_' + augment_index).addEventListener('change', onChangeUnitAugment);
        }
    }
    mainclass.addEventListener('change', onChangeClass);
    subclass.addEventListener('change', onChangeClass);
    weapon.addEventListener('change', onChangeWeapon);
    weapon_level.addEventListener('change', onChangeWeaponLevel);
    sync_augments = document.getElementById('sync_augments');
    load_json_files();
    loadClasses();
    loadWeapons();
    loadUnits();
    loadAugments();
    loadWeaponPrefixes();
    loadUnitPrefixes();
    loadLevels();
    
    document.querySelectorAll('select').forEach((e) => e.addEventListener('change', printLoadout));
    document.querySelectorAll('select').forEach((e) => e.addEventListener('change', setStats));
    document.querySelectorAll('input').forEach((e) => e.addEventListener('change', printLoadout));
    document.querySelectorAll('input').forEach((e) => e.addEventListener('change', setStats));
    document.getElementById('loadout_import').addEventListener('click', importLoadout);
    document.getElementById('loadout_export').addEventListener('click', exportLoadout);
    document.getElementById('add_attack_row').addEventListener('click', addAttackRow);
    document.getElementById('loadout_save').addEventListener('click', saveLoadout);
    document.getElementById('show_loadouts').addEventListener('click', showLoadouts);
    document.getElementById('hide_loadouts').addEventListener('click', hideLoadouts);
    if (window.location.hash.length > 0) {
        document.getElementById('loadout').value = window.location.hash.substring(1);
        window.location.hash = '';
    }
    importLoadout();
    setStats();
    document.getElementById('status').classList.add('d-none');
    document.getElementById('main').classList.remove('d-none');
}

function ready(fn) {
    if (document.readyState != 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

ready(initialize);
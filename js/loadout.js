export class Loadout {
    mainclass;
    mainclass_level;
    weapon;
    units = [];
    weapon_level;
    weapon_augments = [];
    weapon_prefix;
    weapon_prefix_level;
    unit_levels = [];
    unit_augments = [];
    unit_prefixes = [];
    unit_prefix_levels = [];
    subclass;
    subclass_level=20;
    potential_level=0;
    units_enabled = [true, true, true];
    weapon_enabled = true;
    food_stats = {
        "hp": 0,
        "pp": 0,
        "potency": 0,
        "weakpoint_potency": 0,
    };
}
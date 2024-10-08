import ItemWindow from "./item-window.js"
import TradeWindow from "./trade-window.js"
import {Config} from "./config.js"
import {getPlayerCharacters,receiveTrade, completeTrade, denyTrade} from "./lets-trade-core.js"
import {getCompatibility} from "./compatibility.js"
import { openItemTrade } from "./openItemTrade.js"
import { openCurrencyTrade } from "./openCurrencyTrade.js"
import API from "./api.js"

Hooks.once("setup", async function () {
    setApi(API)
    if (game.system.id === "dnd5e") {
        Hooks.on("renderActorSheet5eCharacter", renderInjectionHook);
        Hooks.on("renderActorSheet5eCharacterNew", renderInjectionHook);
    
        //LootSheet5eNPC support
        Hooks.on("renderLootSheet5eNPC", renderInjectionHook);

        Hooks.on("dnd5e.getItemContextOptions", (item, contextOptions) => {
            if (item.actor?.isOwner && !['feat','background','class','subclass','spell'].includes(item.type)) {
               contextOptions.push({
                   name: `${game.i18n.localize("LetsTrade5E.Send")}`,
                   icon: `<i class="fas fa-balance-scale-right"></i>`,
                   callback: ()=>{openItemTrade(item.actor.id, item.id)}
                   })
               }
           });
    } else if (game.system.id === "a5e") {
        Hooks.on("getActorSheetHeaderButtons", renderHeaderButton);

    } else if (game.system.id === "TheWitcherTRPG") {
        await Hooks.on("getActorSheetHeaderButtons", renderHeaderButton);
    }
    else{
      console.error("Let's trade unknown system:",game.system.id)
    }

    game.socket.on(Config.Socket, packet => {
        let data = packet.data;
        let type = packet.type;
        let handler = packet.handler;
        if (handler === game.userId) {
            if (type === "request") {
                receiveTrade(data);
            }
            if (type === "accepted") {
                completeTrade(data);
            }
            if (type === "denied") {
                denyTrade(data);
            }
        }
    });

    console.log("Let's Trade 5e Loaded");
});

async function renderInjectionHook(sheet, element, character) {
    const actorId = sheet.actor.id;
    const compatibility = getCompatibility(sheet);

    if (!compatibility.addHeaderButton) {
        try {
            compatibility.currency(element, actorId, onCurrencyTradeClick);
        }
        catch (e) {
            console.error("Let's Trade 5e | Failed to inject currency icon onto character sheet.");
        }

        let items = compatibility.fetch(element);

        for (let item of items) {
            try {
                compatibility.item(item, actorId, onItemTradeClick);
            }
            catch (e) {
                console.error("Let's Trade 5e | Failed to inject onto item: ", item);
            }
        }

        console.log("Let's Trade 5e | Added trade icons to sheet for actor " + actorId);
    }
}

async function renderHeaderButton(sheet, headers) {
    console.log("Let's Trade 5e | Header Button Render");
    if (sheet.actor.isOwner) {
        headers.unshift({
            label: "LetsTrade5E.TradeButton",
            class: "trade-button",
            icon: "fas fa-balance-scale-right",
            onclick: onHeaderClick.bind({actorId: sheet.actor.id,money:false})
        });
        headers.unshift({
           label: "LetsTrade5E.TradeButton",
           class: "trade-button-money",
           icon: "fas fa-coins",
           onclick: onHeaderClick.bind({actorId: sheet.actor.id,money:true})
        });

    }
}

/**
 * Handles the trade event click.
 * @param {event} event
 */
function onItemTradeClick(event) {
    event.preventDefault();
    const ele = event.currentTarget.closest(".item-trade");

    const actorId = ele.dataset.actorId;
    const itemId = ele.dataset.itemId;
    openItemTrade(actorId, itemId)
}

function onCurrencyTradeClick(event) {
    event.preventDefault();
    const ele = event.currentTarget.closest(".currency-trade");

    const actorId = ele.dataset.actorId;
    openCurrencyTrade(actorId)
}

function onHeaderClick(event) {
    console.log("Let's Trade 5e | Opening item sheet trade dialog for " + this.actorId);
    const actor = game.actors.get(this.actorId);
    var items_filtered;
    if (game.system.id === "TheWitcherTRPG") {
      let itemTypes = ["weapon","armor","component","valuable","alchemical"]
      items_filtered = actor.items.filter(item => itemTypes.includes(item.type));
    }
    else {
      items_filtered = actor.items.filter(item => item.type === "object");
    }

    if (this.money) {
      const actor = game.actors.get(this.actorId);
      const currency = game.actors.get(this.actorId).system.currency
      const characters = getPlayerCharacters(this.actorId);
      console.log(currency);
      const tw = new TradeWindow({
        actorId: this.actorId,
        currencyMax: currency,
        characters
      });
      tw.render(true);
    }
    else {
      const items = items_filtered;
      console.log(items)
      const itemWindow = new ItemWindow({
          items,
          actorId: this.actorId
      });
      itemWindow.render(true);
    }
}
/**
 * Initialization helper, to set API.
 * @param api to set to game module.
 */
export function setApi(api) {
	const data = game.modules.get("lets-trade-5e");
	data.api = api;
}
/**
 * Returns the set API.
 * @returns Api from games module.
 */
export function getApi() {
	const data = game.modules.get("lets-trade-5e");
	return data.api;
}

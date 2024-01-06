import {OnigRegExp} from "onigurumajs"
const path = "lib/highlight"
export async function getGrammar(extension : string) {
	const ref : {[key : string] : string[]} = await Bun.file(`${path}/ref.json`).json();
	for (let i in ref) {
        //console.log(ref[i], i)
        if (ref[i].includes(extension)) {
            //console.log(`code/${i}.json`)
            return await Bun.file(`${path}/code/${i}.json`).json();
        }
    }
}
type pattern =  {
	patterns: pattern[],
	name: string,
	match: string,
	captures: {[key: string]: {name : string}},
	begin: string,
	end: string,
	beginCaptures: {[key: string]: {name : string}},
	endCaptures: {[key: string]: {name : string}},
	include?: `#${string}` | null
}
export function highlightSyntax(json:{patterns:pattern[],repository:{[key : string]: pattern}},text:string,theme?:{[type:string] : `#${{length: 6} & string}`}){
    type highlight = [number,number, {
        types : string[],
		includes: string[],
        method : string
    }]
	type range = {start: number, end: number};
    let highlighted : highlight[] = []
    let highlightStart: highlight[] = []
    let highlightEnd: {[types: string]: [number,number]} = {}
    //console.log(json)
    let included:`#${string}`[] = [];
    for(let i = 0;i < json.patterns.length;i++){
        let rule:pattern = json.patterns[i]
        if(rule.include && !included.includes(rule.include)){
            json.patterns.push(json.repository[rule.include.slice(1)])
        }
        if(rule.patterns){
			json.patterns.push(...rule.patterns.filter((a:pattern)=>!a.include || !included.includes(a.include)).map((a: pattern)=>{
                let pos : pattern;
				if(a.include == null){
					pos = a;
				}else{
                    included.push(a.include)
					pos = json.repository[a.include.slice(1)]
                }
				if(pos.name && rule.name) pos.name += ` !${rule.name}`
				return pos;
            }))
        }
        if(rule.match){
            let prevind = 0;
            let regex = new OnigRegExp(rule.match,'gm');
            //console.log(regex)
            let matches : range[][] = [];
            let hold: range[] = [{start: 0,end: 0}];
            while((hold = regex.searchSync(text, hold[0].end + 1))){
                matches.push(hold);
            }
            if(rule.name){
                highlighted.push(...matches.map((a:range[]):highlight=>[a[0].start,a[0].end,{
						types: rule.name.split(" ").filter(b=>b[0]!="!"),
						includes: rule.name.split(" ").filter(b=>b[0]=="!").map(b=>b.slice(1)),
						method:  "capture"
					}
                ]))
            }
            if(rule.captures){
                for(let i of matches){
                    highlighted.push(...i.slice(1)
                        .map((a,b):[range,number]=>[a,b])
                        .filter((a)=>rule.captures[a[1]]?.name)
                        .map((a:[range,number]):highlight=>{
                            return [a[0].start,a[0].end,{
                                types: rule.captures[a[1]].name.split(" ").filter(b=>b[0]!="!"),
                                includes: rule.captures[a[1]].name.split(" ").filter(b=>b[0]=="!").map(b=>b.slice(1)),
								method:  "capture"
                            }]
                        }).filter((a)=>a[0]!=a[1])
                    )
                }
            }
        }
		// \n
		if(rule.begin){
			let startRegex = new OnigRegExp(rule.begin,'gm')
			let endRegex = new OnigRegExp(rule.end,'gm')
			let startMatches : range[][] = [];
			let endMatches : range[][] = [];
			let startHold: range[] = [{start: 0, end: 0}]
			let endHold: range[] = [{start: 0, end: 0}]
			while((startHold = startRegex.searchSync(text, startHold[0].end + 1))){
                startMatches.push(startHold);
            }
			while((endHold = endRegex.searchSync(text, endHold[0].end + 1))){
                endMatches.push(endHold);
            }
            if(rule.name){
				
			}
			if(rule.captures){
				rule.beginCaptures = rule.captures
				rule.endCaptures = rule.captures
			}
			if(rule.beginCaptures){
                for(let i of startMatches){
                    highlighted.push(...i.slice(1)
                        .map((a,b):[range,number]=>[a,b])
                        .filter((a)=>rule.beginCaptures[a[1]]?.name)
                        .map((a:[range,number]):highlight=>{
                            return [a[0].start,a[0].end,{
                                types: rule.beginCaptures[a[1]].name.split(" ").filter(b=>b[0]!="!"),
                                includes: rule.beginCaptures[a[1]].name.split(" ").filter(b=>b[0]=="!").map(b=>b.slice(1)),
                                method:  "beginCapture"
                            }]
                        }).filter((a)=>a[0]!=a[1])
                    )
                }
            }
			if(rule.endCaptures){
                for(let i of endMatches){
                    highlighted.push(...i.slice(1)
                        .map((a,b):[range,number]=>[a,b])
                        .filter((a)=>rule.endCaptures[a[1]]?.name)
                        .map((a:[range,number]):highlight=>{
                            return [a[0].start,a[0].end,{
                                types: rule.endCaptures[a[1]].name.split(" ").filter(b=>b[0]!="!"),
                                includes: rule.endCaptures[a[1]].name.split(" ").filter(b=>b[0]=="!").map(b=>b.slice(1)),
                                method:  "endCapture"
                            }]
                        }).filter((a)=>a[0]!=a[1])
                    )
                }
            }
		}
    }
    return highlighted
}


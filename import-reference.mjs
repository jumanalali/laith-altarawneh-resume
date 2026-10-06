import {resume} from './src/content.js';
import {readFileSync,writeFileSync} from 'node:fs';
const html=readFileSync('reference.html','utf8');
const plain=s=>s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const [intro,experience,contact]=resume.sections;
const about={id:'about',label:'About',title:intro.blocks[2].text,blocks:intro.blocks.slice(3,5)};
const education={id:'education',label:'Education & Certifications',title:'Education & Certifications',blocks:[intro.blocks[5]]};
intro.blocks=[...intro.blocks.slice(0,2),{type:'link',label:'Explore projects',href:'#projects'}];
const skills={id:'skills',label:'Skills & Tools',title:'My toolkit',blocks:[experience.blocks.at(-1)]};
experience.blocks=experience.blocks.slice(0,-2);
const ids=['rahma','freelance','htu'];
let index=0;
for(const b of experience.blocks)if(b.action)b.action.href='#project-'+ids[index++];
contact.blocks.at(-1).href='#projects';
const projects={id:'projects',label:'Selected Projects',title:'Selected projects',blocks:[]};
for(const id of ids){
 const template=html.match(new RegExp('<template id="project-'+id+'">([\\s\\S]*?)</template>'))[1];
 const title=plain(template.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)[1]);
 const paragraphs=[...template.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(m=>plain(m[1]));
 const links=[...template.matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(m=>({href:m[1],label:plain(m[2])}));
 const summary=plain(html.match(new RegExp('data-project="'+id+'"[\\s\\S]*?<strong>[\\s\\S]*?</strong>\\s*<span>([\\s\\S]*?)</span>'))[1]);
 projects.blocks.push({type:'caseStudy',id:'project-'+id,title,summary,meta:paragraphs[0].replace(/^\d+\s*\/\s*/,''),challenge:paragraphs[1],contribution:paragraphs[2],tools:paragraphs[3],links});
}
resume.sections=[intro,about,experience,projects,skills,education,contact];
resume.source.status='Retrieved reference HTML on 2026-10-02; all profile and project text and external destinations imported.';
resume.source.missing='The reference contains project-image placeholders, not actual project images. No email, phone, or degree details are provided.';
writeFileSync('src/content.js','export const resume = '+JSON.stringify(resume,null,2)+';\n');

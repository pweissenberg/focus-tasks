# Focus Tasks: code map

Read this first, then open only the file you need. Pedro's to-do site is published as the Artifact
"Focus Tasks" (https://claude.ai/artifact/K7DkBoqQhUD1JksSn32FEL). The UI text is English, and replies to Pedro are in Portuguese.

## Making a change

1. Find the feature in the tables below and edit that file in `src/`. **Never edit `index.html`.** The build overwrites it.
2. Build: `python3 /mnt/project-files/todo-site/build.py`. This writes `index.html` and syntax-checks the JS. A syntax error is reported as `src/js/<file>:<line>`. `build.py --check` only says whether `index.html` matches `src/`.
3. Test, sized to the change:
   - **Small change** (a style, a label, one handler or popup): `node /mnt/project-files/todo-site/tests/quick.js`. About 20 s and 32 checks at 1440px light and 390px dark.
   - **Big change** (new feature, layout, `render()`, state shape, sync, timer): `node /mnt/project-files/todo-site/tests/full.js`. About 2 min and 43 checks across 5 sizes in light and dark, plus feature checks.
   - **Several suites at once** (fastest): `node /mnt/project-files/todo-site/tests/run.js quick microtasks` runs the named suites in parallel; with no names it runs all 19 in about 1 min 50 s (full.js alone is most of that). It retries once only a suite that crashed before any check. Run the suites for the feature you touched, not all of them.
   - Screenshots land in `/tmp/focus-shots/`. Look at them (Read tool) only when the change is visual.
   - When a new feature must keep working, add a check to quick.js or full.js.
4. Publish with the Artifact tool, using `file_path` = `/mnt/project-files/todo-site/index.html` and `url` = the link above. Don't pass `icon`. In a new conversation, first call the Artifact tool with `action: "read"` on the link, because a publish to an artifact the conversation hasn't read is refused.
5. If you added a file, a state key or a convention, update this map.

## How the build works

- `src/page.html` holds the title, the font links and all the markup: landing page, sidebar, panel, timer aside, rail and shortcuts footer. It also has two placeholder lines, `@@CSS@@` and `@@JS@@`, and wraps the script in `(function(){ … })();`.
- `src/css/*.css` and `src/js/*.js` are pasted in file-name order, so the number prefix is the order.
  - CSS order is cascade order.
  - Top-level JS runs top to bottom. Functions are hoisted, but `const`/`let` are not.
- To add a file, give it a number between its neighbours (e.g. `185-backup.js`).
  - JS must stay before `990-init.js`. That file runs `render()` and `initCloud()`, so code placed after it isn't ready at start-up.
  - Each JS file ends at a top-level statement and parses on its own. `build.py` relies on this to name the broken file.
- `index.html` has no doctype or head. The artifact adds `<!doctype html><head><meta charset>` when it is published. The build also writes `focus-tasks.html`, the same page with doctype, charset and viewport, which opens on its own (double-click, or any web host) for use without Claude.

## CSS (`src/css`)

| file | styles |
|---|---|
| 010-base | color tokens (`:root` + two dark blocks), base elements, `.app` grid (sidebar, panel, timer aside, rail) |
| 020-sidebar | brand, projects list (`.plist` `.pitem`), "+ New project" |
| 030-panel-header-composer | panel card, header (title, counter, views), add bar `.composer`, tag tabs `.tab`, sort row, on-hold toggle, banner, form fields `.fld`, swatches |
| 040-task-list | task rows `.task` (grid: color bar, caret, check, name + meta, note, actions), chips, empty states |
| 050-notes | the notes box under the list |
| 060-popovers-modals | `.pop`, date picker `.dp`, `.modal`, buttons `.btn`, `.toast` |
| 070-timer | timer button on rows, timer and white-noise cards (`.card`, `.clock`, presets, sounds) |
| 080-stats | stats page (hero, period picker, breakdowns), "add time?" toast after done |
| 090-calendar | week calendar (grid, blocks `.blk`, chips `.tchip`, block popover) |
| 100-project-page | project page (head, tabs, notes cards `.pn`, free canvas `.cv`, drawing tools), project add bar `.pt-add` |
| 110-search-nowbar-agenda | search box + results `.sr`, "now" bar, active task, ghost rows, agenda, calendar due row |
| 120-responsive | main breakpoints: 1180 (timer becomes a drawer), 980 (one column), 900 and 560 (add bar rows) |
| 130-landing-accounts-sharing | landing page, account button/menu, settings, avatars, share popover, sign-in modal |
| 140-rail | right rail `nav#rail` (top row at <=980px, tighter at <=400px), container queries for task rows and the sort row |
| 150-priority | priority flags `.pflag` `.pr1-3` |
| 160-reminders | reminder cards `.rstack` `.rcard`, bell in row meta |
| 170-pomodoro | timer/pomodoro switch, phase dots, break colors |
| 180-daily-goal | goal card, streak flame, progress |
| 190-shortcuts | shortcuts modal, `.ksel` selected row |
| 200-archive | Done bar `.donebar`, archived label |
| 210-add-bar-gear | gear `.cgear` and the "Advanced settings" panel `.cadv` in both add bars |
| 220-shortcuts-footer | shortcuts line at the bottom `.kfoot` (hidden <=760px and on touch screens), page min-height, reduced motion |
| 230-steps | step boxes on task rows `.stepadd` `.stepbox` |
| 240-shared-projects | members button `.pp-people` on the project page, shared mark `.pshared` in the sidebar |
| 260-project-extras | project header meta (deadline chip, progress bar, complete), Board columns/cards, Files and Activity tabs, assignee button, Free zoom wrapper `.cv-size` and `.cv-img` |
| 270-project-plus | sections `.secdiv`, custom board columns `.board.cust`, Timeline `.g-*`, Time tab `.tm-*`, templates `.tp-*` |
| 275-comments-perms | comment button `.cmt`, comments modal `.cmts`/`.cm-*` with @ list `.cm-at`, view-only note `.ro-note` and `#projPage.ro` hiding |
| 250-shapes-friends | Free canvas shape hit areas, selection box, delete dot; the Friends window `.modal.friends` |

## JS (`src/js`)

| file | does | main names |
|---|---|---|
| 010-basics | constants, `$`, `esc`, `uid`, dates (US format MM/DD/YYYY in the UI, ISO in state) | `parseDate` `isoToUS` `todayISO` |
| 020-state | state `S`, task defaults, example data, defaults, save | `T()` `seed` `normalize` `load` `save` `saveSoon` `commit` `CL` |
| 030-task-helpers | lookups, tree (subtasks), filters, sorting, moving, complete/reopen | `byId` `kids` `rootOf` `cmp` `nestInto` `moveStep` `complete` `reopen` |
| 035-steps | numbered steps (`t.steps` [{name,done,doneId}], `t.stepSel`): the row shows the selected step (it can be a done one, shown ticked; untick reopens it) and `t.name` is its name; ticking finishes the selected step, which goes to Done as its own task (`stepOf`); the last step completes the task. The pencil on step 2+ opens `openStepEdit` (name, number, delete; moving swaps positions and keeps names) | `selectStep` `doStep` `undoStep` `moveStepTo` `openStepEdit` `stepsHTML` |
| 040-icons-priority | SVG `icons`, priority list + menu, `<option>` lists | `icons` `PRIOS` `openPrioPop` `optionList` |
| 050-add-bars | add-bar state, priority/color buttons, gear "Advanced settings" (`c` = main bar, `pt` = project bar), creating a task from a bar | `ADV` `advShow` `advSync` `addFromBar` `paintPtBar` |
| 060-render | `render()` redraws the screen (it calls `renderTimer`, `renderStats`, `renderCalendar`, `renderProjPage` as needed); `row(t)` builds one task row | `render` `row` |
| 070-toast-popovers | toasts, popover placement, color swatches, tag and project popovers | `toast` `openPop` `closePop` `openTagPop` `openProjPop` |
| 080-date-picker | date picker on MM/DD/YYYY inputs | `bindDate` `openDP` |
| 090-edit-modal | the pencil "Edit task" window (all task fields) | `openEdit` `closeModal` |
| 100-events | clicks and inputs: views, sort, tags, task row actions, main add bar + gear, Done bar | `goView` |
| 102-microtasks | microtasks `t.micro` [{id,name,done}] under a row (wraps `row()`): "+" on the bottom-left corner, Enter adds the next, empty ones drop on blur; ticking does not touch Done; read only in Done. Also the "↑ Send to long term" / "↓ Back to tasks" corner button; test tests/microtasks.js | `microHTML` `addMicro` |
| 110-drag-drop | drag rows: middle = make subtask, edges = reorder | |
| 120-time-tracking | sessions, time per task, start/pause/reset | `logSeg` `allSessions` `spentOf` `timerStart` `timerPause` |
| 125-pomodoro-timer | pomodoro phases, end of timer, timer card render | `timerFinish` `nextPhase` `renderTimer` `timerParts` |
| 128-tab-title | tab title countdown + blink, 1 s worker tick for background tabs | `setTitle` `startBlink` `secTick` |
| 130-audio-theme | white noise + chime (Web Audio), dark/light theme | `startNoise` `chime` `renderTheme` |
| 140-periods | day/week/month/year periods, period picker | `period` `openPeriodPicker` |
| 145-stats-goal | stats page, daily goal + streak | `renderStats` `goalInfo` `openGoalPop` |
| 150-calendar | week calendar: blocks, drag/resize, add block, due row | `renderCalendar` `openAddBlock` `openBlockPop` |
| 160-done-time-notes | "add time?" toast after done; notes box resize | `askAddTime` |
| 170-project-page | project page: header, Notes / Tasks / Free tabs, project add bar, canvas items | `renderProjPage` `openProject` `curProject` |
| 175-project-tools-drawing | canvas tools and free drawing | `endDraw` `eraseAt` |
| 172-project-extras | project deadline `p.due` + progress bar, Mark complete/Restore (`p.archived`, hidden from sidebar unless S.ui.showArchProj), activity log `p.activity` (logAct, newest first, max 200), Board view of Tasks (S.ui.projBoard; columns To do/Doing/Done via `t.doing`), Files tab `p.files` (links + uploads ≤2MB as dataURL) | `projMetaHTML` `toggleArchive` `logAct` `boardHTML` `moveToCol` `renderFilesTab` `renderActivityTab` |
| 173-project-plus | project sections `p.sections` (task `t.section`, S.ui.ptSection = where the add bar puts tasks), custom board columns `p.cols` (task `t.col`), Timeline view (S.ui.projGantt; bars from `t.start` or created date to `t.due`, drag to move/resize), Time tab, templates `S.templates` (Save as template / START FROM in New project). `projExtra(p)` = the project fields that sync in shared_projects.extra | `projExtra` `secWalk` `projCols` `boardHTML` `ganttHTML` `projTime` `renderTimeTab` `saveTemplate` `applyTemplate` |
| 177-canvas-shapes | Free canvas shapes (rect, ellipse, tri, line, arrow): a shape is a stroke with `shape` + x1,y1,x2,y2 (no pts), so Undo/Erase/Clear/project sync treat it like a line. Select tool: click to select, drag to move, Delete or the red dot removes; color/width buttons restyle the selected shape | `SHAPES` `shapeD` `shapeHTML` `delShape` `shapeRestyle` |
| 180-recurring-reminders | repeats, reminders, auto-archive | `nextDue` `checkReminders` `fireReminder` `autoArchive` `REMINDS` `REPEATS` |
| 190-nowbar-agenda-search | calendar block happening now, global search, jump to task (the old Today view code was removed 2026-10-16) | `renderNowBar` `searchAll` `goToTask` |
| 200-shortcuts | keyboard shortcuts, the list modal, footer list, J/K selection | `KEYS` `FOOT_KEYS` `openShortcuts` `selectRow` |
| 210-cloud-sync | account sync of `S` (key/value rows), avatars | `SYNC_KEYS` `startCloud` `pushState` `pullState` |
| 212-shared-tasks | sharing and passing tasks between people, share popover | `shareTask` `reconcileShared` `openSharePop` |
| 216-shared-projects | project members: add/remove/leave, project row sync (name, color, Notes, Free canvas), every task of a shared project shared with all members (with project_id, parent_id), members button on the project page | `reconcileProjects` `pushProjects` `syncProjectTasks` `addProjectMember` `leaveProject` `openProjSharePop` |
| 179-free-textfit | Free text boxes and notes grow to fit their text (no scrollbar); test tests/free-textfit.js | `fitCvText` |
| 178-free-zoom-images | Free zoom (S.ui.cvZoom, −/%/+ and Ctrl+wheel; all pointer math divides by `cvZ()`), images in Free (+ Image, paste; shrunk to 1200px, item type 'image' with src) | `cvZ` `setZoom` `addCanvasImage` |
| 217-task-assignee | who is responsible for a task in a shared project (`t.assignee`, synced in 212 rowBody/sharedBody along with `t.doing`) | `canAssign` `assigneeHTML` `openAssignPop` |
| 219b-team-tab | project Team tab: members with role (Owner, Can edit, View only; the owner changes it there), open and done tasks they are responsible for; test tests/team-tab.js | `renderTeamTab` |
| 218-friends | friends list `S.friends` [{id}|{email}] (synced key): account menu > Friends window; friends shown first ("friend") in a project's Add person, and "Add friend" on member rows | `openFriends` `addFriend` `friendCands` |
| 219-comments-perms | task comments (v59: on every task; `cmtHolder(t)` = the project for project tasks, else the task itself with `t.comments` synced as `comments` in 212; each comment goes to the history) `p.comments[taskId]` [{id,by,at,text,mentions,del}] in a modal with @mention picker (members only); `mergeExtra` merges remote project extras (comments by id, delete markers win) and toasts when I am mentioned. Per-person permission `p.perms[uid]="view"` set by the owner in the members popover; `isRO(p)` blocks changes (window capture listeners, `openEdit` wrap, shortcuts) but allows tabs, layout, people, comments, timer | `cmtBtnHTML` `openComments` `mergeExtra` `isRO` `roTask` `permHTML` |
| 214-account-signin | account button/menu, sign-in modal, settings (name, photo) | `renderAccount` `openSignIn` `openAccountPop` |
| 221-quick-entry | add bar quick entry: "[" tag menu (Tab picks first), ";" time → `t.est` minutes (synced), chip `.estc` + popover, glow `.task.quick` on open tasks under `S.prefs.quickMins` (default 3, 0 off; Settings and the chip), hint tip on focus; "@name" in the main bar picks the project (#c-proj; exact or unique prefix); "!" = High priority, "!1"/"! 1" Low, "!2" Medium, "!3" High, and High open tasks get a red "!" before the name; test tests/quick-entry.js | `parseDur` `fmtEst` `estHTML` `isQuick` `qeApply` |
| 222-gtd | GTD (next action was removed at Pedro's request): Waiting for `t.waitFor`/`t.waitSince` (asked when ticking On hold), time filter pill `#timeFilter` (`S.ui.estMax`), defer `t.defer` and glow `t.glow` (edit window; defer hides until the date, `S.ui.showDeferred` line), weekly review modal from the rail `#reviewBtn` (Notes = inbox; `S.prefs.lastReview`, dot after 7 days). Wraps `vis` `row` `complete` `render` `openEdit`; test tests/gtd.js | `openReview` `isDeferred` |
| 223-bg-people-roles | task background `t.bg` (edit window) and Settings "Tag color on tasks" (`S.prefs.tagFill` bar/fill), Free "+ Box" (`cv-box`), role in project `p.roles` (Team tab, members popover), People layout of the Tasks tab (`S.ui.projPeople`, filters `S.ui.ppl`); test tests/bg-people.js | `peopleHTML` `roleOf` |
| 224-project-tree | Tree tab: plan nodes `p.tree` [{id,name,parent,taskId,closed}] (synced in projExtra); → Task makes a linked project task (subtask of a linked parent), Plan only removes the task and keeps the node; Enter/Tab/Backspace keys; test tests/project-tree.js | `renderTreeTab` `trMakeTask` `trUnlink` |
| 225-hard-day | hard task of the day `S.prefs.hard` {id,date} (only tasks open > 2 work days; cleared when done/hold/long term/deleted; section `.hard-sec` at top of Tasks), rail #reviewBtn now opens a menu (Plan my day / Daily review / Weekly review), Plan my day (quick → hard → urgent, fitted into free time as calendar sessions), Daily review (`S.journal` {iso:text}, move to tomorrow); journal synced (habits were removed in v38 at Pedro's request); CSS 297-hard-day.css; test tests/hard-day.js | `hardOk` `hardTask` `planOrder` `fitPlan` `openPlanDay` `openDailyReview` |
| 226-tree-marks | Tree tab dashed guides LINKED TO NODES `p.treeMarks` [{id,type:h|v|box|a,from,to,label,color,len}] (synced in projExtra): line under node `from`, bracket ] from..to with dashes out at top and bottom, box around from..to; laid out from the visible nodes after each render (`tmLayout`), so they follow folds and hidden done nodes; "Show done" `S.ui.trDone` (done task nodes hidden by default); drag a line or a top/bottom handle to snap to another node, drag a bracket sideways (`m.dx`, never over its nodes); a line has text above (`label`) and below (`label2`); `.tr-canvas` has no vertical scroll of its own; CSS prefix `.gd-` (`.tm-` is taken by the Team tab and reminders); v73: type `a` = arrow from the right side of node `from` going right, ending in a text (`label`), width `m.len` (drag the tip), drag it up/down to snap to another node; test tests/tree-marks.js | `trFlat` `tmLayout` `openTmAdd` |
| 227-repeat-options | repeat choices under the Repeat select (edit window and add bars, `ADV[k].a.repx`): "Some days of the week" `{freq:'days',days:[0-6]}`, weekly `wd`, monthly `mday` (1-31, -1 last) or `nth` (1-4, -1 last) + `nwd`; date math (`nextDue(iso,repeatObj)`, `repMatches`, `firstDue`, `repLabel`) lives in 180; a new repeat without a due date starts on its first matching day; CSS at the end of 298; test tests/repeat.js | `repXHTML` `repDefaults` `repXBind` |
| 228-waiting-for-me | Waiting for people: the wait popover picks several people (`t.waitUids`, `t.waitBy`), with name suggestions as you type, plus someone else by name (`t.waitWho`) and what (`t.waitWhat`); `t.waitFor` is the row line ("Paul, Ana - numbers"). "Show it on their list" off (`t.waitShow=false`, names in `t.waitQuiet`) shares nothing. Picked people get the task shared and see it in a "Waiting for me" section at the top of Tasks; "Done my part" moves them to `t.waitDone`, and when no one is left the asker's task comes off hold (`applyWaitSync`, called from 212); test tests/waiting-for-me.js (two users) | `openWaitPop` `applyWaitSync` `waitingForMe` |
| 229-send-tasks | Send (share popover, for new people and for people already sharing it): `t.sentBy`/`t.sentTo`; the receiver sees "Sent from"; for the sender it leaves the lists and goes to Done › "Done my part" (with tasks where you did your part), showing whether it is still open. Received / Sent buttons before Sort (`#srBar`, `S.ui.sr {k,who}`) show the people once picked. Test mode seeds two example tasks from User 2 for User 1 once (`d.demoSent` in the local DB; tests turn it off with `window.FOCUS_NO_DEMO` unless `demo:true`) | `recvFrom` `sentTo` `inDmp` `paintSrBar` `paintDmp` |
| 230-glow-share-polish | Glow on a task with microtasks also goes around the microtask box (`--mth` set on render; CSS end of 280). Share popover "pick first" (`.pickfirst`): people show only after typing, Send/Share appear after picking a row; the old Pass button is hidden (Send does what Pass did). Timer rail icon is a clock (page.html) | `openSharePop` wrapper |
| 231-history-alerts | Task history `t.log` [{id,at,by,what}] (page icon `data-act="log"` before Send/Share; subtask and microtask events also go on the top task; synced as `log` in 212, merged by id). Alerts `S.alerts` (synced; `addAlert(text,taskId,projId)`, also fired from 212 assignee, 216 added/removed from a project, 219 @mentions) behind the bell `#bellBtn` in the rail. On tasks someone waits on you for, a "Done my part" button replaces the done checkbox (`.mypart-btn`, `data-wfmdone`; one line over the caret and check columns, caret hidden; `--chk` can widen the check column but is left at 26px so names line up). A task that comes back off hold gets `t.backAt`/`t.backFrom` (row `.back`, banner `.back-tag`). Test mode seeds "Get the quotes" (User 2 does their part 20 s after User 1 opens) and "Check the contract" (waiting for User 1). CSS in 300 | `logTask` `addAlert` `openLogPop` `goToTask` |
| 232-project-export | Project header "Export" (`data-pexp`): Backup file (.json, `projBundle`, format `focus-tasks-project`) or Readable file (.md, `projMarkdown`). "Import a project" under + New project (`#importFile`) makes a new copy with new ids (`importProject`). Files go through the `downloads` capability in claude.ai (artifact is published with `capabilities: {downloads: true}`; keep it on every publish that passes capabilities), a plain download elsewhere (`saveFile`) | `saveFile` `projBundle` `projMarkdown` `importProject` |
| 233-filters-polish | Removes the "I have X min" Time pill (`#timeFilter`, 222; `S.ui.estMax` forced to 0). Wraps Sort and its buttons in `.sortgrp` so they stay together at the right end of the row. v61: Received / Sent / Done my part merged into one `#srBtn` ("Shared", no numbers) at the start of `.sortgrp`; its `.sr-menu` dropdown lists All tasks, the 3 kinds (`data-srk`) and then the people (`data-srw`); `paintSrBar` is overridden here. While a kind is picked, `cmp` sorts by `lastTouch(t)` (newest of created, log, done, wait, back, comments) | |
| 234-dependencies | Task dependencies (v62): `t.waits` [taskId] (synced as `waits` in 212; SQL column added), WAITS FOR chips + select in the edit window (`depCands` never offers a task that already depends on this one, so no cycles). Blocked open tasks (`isBlocked`, `blockersOf`) get `.blocked` + a "Blocked by" tag in the meta, sort after free ones (cmp wrap); v63: hidden by default in Tasks/Long term, shown by the small lock `#blockToggle` after On hold (`S.ui.showBlocked`; the lock only appears when the view has blocked tasks). Add bars' Advanced settings: "Block task until [open task] is done" (`ADV[k].a.block`, `#c-block`/`#pt-block`). Board cards get a lock, the Timeline an SVG `.g-deps` with elbow arrows. `t.depWas` (local) remembers the blocked state, and when it clears an alert + toast + history line say it is ready to start (only for the assignee, or anyone if none). Examples "Run/Write/Present the survey ..." seeded once (`S.prefs.demoDeps`, off with FOCUS_NO_DEMO). CSS end of 300; test tests/dependencies.js | `isBlocked` `blockersOf` `dependsOn` `depCands` `depAfterRender` |
| 235-my-team | My team (v64): org chart table `org` {user_id, manager_id} (SQL with `manages(boss,who)` and a read-only `user_state` policy for keys tasks/tags/projects; local backend seeds User 1 as User 2's manager and refuses manager writes). `TEAM` holds the org and the loaded data; the rail button `#teamBtn` (after the bell) shows only for someone who manages people (direct or further down). The modal `.myteam` lists the people (open / overdue counts) and the selected person's tasks in sections (Overdue, next 7 days, open, blocked, on hold, long term, done in 7 days), view only, with Refresh. The person managed sees "Your manager … can see your tasks" in the account menu (`.am-mgr`). CSS prefix `.myt-` (`.mt-` is the microtasks). Test tests/my-team.js | `loadOrg` `loadTeamData` `teamUnder` `teamGroups` `openTeam` |
| 236-tree-notes | Tree tab: comment inside a node. The comment panel sits INSIDE the node card (`.tr-node.tr-open`, Pedro wanted it to read as one thing). The speech icon on a node (`data-trexp`, `.tr-exp.has` when there is a comment) expands it (`S.ui.trOpen` [nodeId], per device) into `.trn-panel` under the node: a textarea with the comment (plan node: `n.comment`, synced in p.tree; task node: the task note `t.note`), and for a task node its settings (`.trn-set`) + Edit task + comments button. → Task moves `n.comment` into `t.note`, Plan only copies it back. CSS 301-tree-notes.css; test tests/tree-notes.js | `trCmt` `trSettingsHTML` |
| 237-tree-node-done | Tree: plan nodes get a check box (`n.done`, `n.doneAt`). Done nodes (plan and task) STAY in the tree: this file switches off 226's "Show done" hiding (forces `S.ui.trDone` during render and removes the label). "Off tree" on a done node takes it out (children move up); a done plan node goes to `p.treeDone` [{id,name,comment,doneAt,path}] (synced, added to projExtra in 173). Done tab: section "Done in project trees" (`.tnd-sec`, wraps `render`) with project, path, date, comment, Open tree, untick to reopen (off-tree ones go back at the root), × deletes off-tree ones. Test in tests/tree-notes.js | `trTakeOff` `trDoneRows` |
| 238-project-tabs | Project tabs = subprojects (v67): a tab is a normal project with `p.tabOf` = main project id (synced in projExtra), so it has its own tasks, Notes, Free, Tree... Hidden from the sidebar (render wrap; main gets `.page`), strip `.pxtabs` under "Back" on the project page (Main + tabs + "+ Tab"; pencil on the open tab = rename / add from a template / delete, tasks move to Main). "+ Tab" takes several comma-separated names and a template. `projFull(p)` = "Project, Tab": used on task rows (`.projtag`, 060), project pickers (`optionList` wrap) and "@Project, Tab" in the main add bar (221, comma spacing normalized). Templates now also save/apply the Tree (`tpl.tree`, `tpl.treeMarks`; wraps `saveTemplate`/`applyTemplate`). v68: tab state `p.recurring`, `p.closedAt`, `p.cycles` [{at}], `p.resetAt` (synced in projExtra); bar `.pxstat` under the strip (Mark tab done / Reopen / Reopen and reset; each logs to Main's Activity), (v69: strip filter removed; Main's Activity has List/Table `S.ui.actTable`, table = `tabCycleRows` Subproject/Open/Done, dones within 10 days merged into the last; cycles {open,at}, `p.createdAt`/`p.openedAt`), Tree bar "Import from Main" (`importMainTree`) and "Reset checks" (`resetChecks`). v70: Plan tab on the main project (`data-ptab=plan`, added after Activity by a renderProjPage wrap; `planTabHTML`): start date per subproject `x.planStart`; on that day a red dot `.pxdot` shows on the main project in the sidebar, on the Plan tab and on the subproject chip, they stay until "Started" in Plan (`startTab`: sets `x.planStarted`, reopens a done tab) or a manual Reopen while due; Mark tab done clears `planStart` (v71). CSS 302-project-tabs.css; test tests/project-tabs.js (uses the fake clock) | `planDue` `planDot` `markTabDone` `reopenTab` `tabRoot` `projTabs` `projFull` `addTabs` `deleteTab` `tabStripHTML` |
| 239-layout-tweaks | v72 (Pedro's list items 1, 9, 12, 13). A fresh start is empty: 020 `seed()` gives example tasks only with `window.FOCUS_SEED` (tests), and the demos in 229/231/234 run only with `window.FOCUS_DEMO`. Old saved data loses those examples once per account (`cleanExamples`, `S.prefs.exClean`; `demo-*` rows also leave `focus-localdb`); p_research / p_personal go only if empty. Default tag per project `p.tagId` (synced via projExtra; "Default tag" select `#pj-tag` in the project pencil popup; `projDefTag` falls back to the main project for tabs; filled on add and on `#c-proj` change; project page `#pt-tag` default). History popup title shrinks to 10px then wraps. On hold rows fold (`.hold-min`, `.hexp` arrow, `.hreason` = waitFor or note; open ids in `S.ui.holdOpen`); never folded: waiting-for-me, steps, Done view, or `window.FOCUS_HOLD_OPEN` (harness sets it). CSS 310-layout-tweaks.css (wider app: left column 236px, no max-width; project dots hidden). Test tests/layout-tweaks.js | `cleanExamples` `projDefTag` `holdOpen` |
| 239-tree-color-move | Tree v73 (Pedro's list items 2-6 + red !). Colors: `n.color` (synced in p.tree); a node without one takes its nearest ancestor's (`trColor`), node + the lines next to it (`--lc` on the li, `--nc` on the node). Palette button `data-trcol` in the hover tools: 9 swatches, "Same as above" clears the own color, optional "Also for the N nodes under it" clears theirs. Move: grip `data-trmove` (⠿) in the hover tools, pointer drag onto a node: top band = before, middle = inside (last child), bottom band = after its subnodes; subnodes come along; never into its own subnodes; the linked task follows (`trMove`: back to top level or nested under the new parent's task); toast with Undo. Red "!": `n.flag` (synced in p.tree) toggled by `data-trflag` in the hover tools, shows `.tr-flag` before the name (not copied by templates). Templates / Import from Main copy `color` (238). Layout (303-tree-more.css): the name fills the node, fold + comment icon at the end, the other tools float on the node's top-right edge on hover (so done nodes keep the normal size; on touch they stay visible). Test tests/tree-more.js | `trColor` `openTrColor` `trMove` |
| 245-auto-backup | Automatic backup of the whole account (v72): every `S.prefs.backupHours` (default 6, 0 off; last time per device in localStorage `focus-backup-last:<uid>`) a file `focus-backup-<user>-YYYY-MM-DD_HH-MM-SS.json` (format `focus-tasks-backup`, the whole `S`) is kept in IndexedDB `focus-backup` (store `snaps`) and written to the folder picked in Settings (File System Access handle in store `kv` as `dir:<uid>`; only Chrome/Edge on the standalone focus-tasks.html, not inside claude.ai). Both keep the newest 2 + the last before today + the last before this Monday (`bkKeep`). Permission lost after a restart → toast with Allow. Settings section `.bk-set` (interval, Back up now, Choose folder, Load a backup, Download a backup); Load window `.bk-load` replaces S (keeps S.ui) after a second click, and keeps the state before the load as `before-load`. CSS 310-backup.css; test tests/auto-backup.js (https page, OPFS as the folder) | `runBackup` `bkKeep` `bkTick` `bkPick` `bkRestore` `openBkLoad` |
| 220-local-backend | local stand-in for Supabase (used when no server is configured) | `localBackend` |
| 990-init | picks Supabase or the local backend, first `render()` | `initCloud` |

## State

- `S` (020-state.js) is the whole app, saved as JSON with `commit()` = `save()` + `render()`.
  - `tasks[]`: fields come from `T()`: id, name, color, tagId, projectId, due (ISO), time 'HH:MM', note, onHold, done, doneAt, createdAt, parentId, order, longTerm, collapsed, doneWithParent, prio 0-3, remind (minutes before, null = off), archived, steps, stepOf (a finished step's Done entry), repeat {freq}, plus remindFired/snooze bookkeeping.
  - `tags[]` {id,name,color}.
  - `projects[]` {id,name,color,notesList,canvas,strokes}.
  - `sessions[]` (time blocks).
  - `timer` {taskId,durMs,remainingMs,upMs,running,segStart,mode,phase,round,timerMs}.
  - `noise`, `theme`, `notes`, `example`.
  - `friends` [{id}|{email}] (account friends, 218-friends).
  - `prefs` {goalMins,goalDays,archiveAfter,pomo{focus,short,long,every,autoBreak}}.
  - `ui`: view ('tasks', 'long', 'done', 'calendar', 'stats', 'project'), tag, project, sort, dir, hideHold, timerOpen, noiseOpen, projectPage, projTab, showArchived, stats and calendar anchors, notesH.
- New fields go into `T()` (tasks) or `normalize()` (everything else), so old saved data gets them.
- Storage:
  - localStorage `focus-todo-v1:<userId>`.
  - Keys listed in `SYNC_KEYS` (210-cloud-sync.js) follow the account. Add a new top-level key there if it should.
- Accounts:
  - With no `window.FOCUS_CONFIG`, `220-local-backend.js` imitates Supabase in localStorage `focus-localdb`, plus `focus-localdb-evt` and `focus-localfile:*`. The session lives in sessionStorage `focus-local-session`.
  - Test accounts are 1/1 and 2/2. `tests/shared-projects.js` (about 30 s) checks project members with both accounts in two windows; run it after touching sharing or the project page. `tests/shapes-friends.js` (about 15 s) checks Free shapes and friends. `tests/project-extras.js` (about 20 s) checks deadline, complete/archive, board, files, activity, assignee, zoom and images. `tests/project-plus.js` (about 20 s) checks sections, columns, timeline, Time tab and templates. `tests/comments-perms.js` (about 25 s, two accounts) checks comments, @mentions and view-only members.
  - Shared projects: table `shared_projects` (local backend and `supabase-setup.sql`); `CL.sproj`/`CL.psent` hold the rows and what was last sent. Local project objects get `shared`, `members`, `invited`, `owner`.
  - Remote rows override the local cache at sign-in, so a test that edits localStorage must edit `focus-localdb` as well.
- Page state outside `S`: `composerColor`, `composerPrio`, `ADV`, `ptPrio`, `ptColor` (add bars), `kbSel` (J/K selection), `blink` (tab title), `dp`/`pop`/`modal` (whatever is open).

## Design rules Pedro set

- Header holds only title, views (Tasks / Long term / Done) and search.
- New global tools go in the right rail. Its order is avatar, Tasks, Calendar, Stats, Timer, White noise, Theme.
- Every color is a token in 010-base.css, with light and dark values.
- It must work at 360px with no sideways scroll. `.panel` is a size container (`@container panel`).

## Known limits

- Inside claude.ai the browser tab belongs to claude.ai. Title changes (timer countdown and blink, reminder bell) only show on a hosted copy.
- Browser notifications are blocked in the artifact.
- Reminders fire only while the page is open.
- Real accounts (Supabase + GitHub Pages) are ready but paused by Pedro: see `SETUP.md` and `supabase-setup.sql`.
- Backup to a folder works only in Chrome/Edge on the standalone focus-tasks.html (claude.ai runs the page in a sandboxed frame).

## Tests (`tests/`)

- `harness.js` serves `../index.html` at http://app/ and answers Google Fonts from `tests/fonts`. It signs in user 1 (`user:0` = signed out), uses 5 s action timeouts and collects page errors.
- Helpers: `checks()`, `state(p)`, `shot(p,name)`, `noSideScroll`.
- `open(br,{clock:true})` installs a fake clock (`p.clock.runFor(ms)`).
- Playwright and Chromium come preinstalled in the cloud container (`/opt/node-tools`, `/opt/pw-browsers`). Don't run `playwright install`.

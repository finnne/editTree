/*
	==================可编辑树===================



	=============================================
*/

function EditTree(){
	this.nodeIndex = [];
	this.newNodeName = "新建节点";
	this.editFlag = false;
	this.icon = {
		"expand":	'tree-icon icon-expand',
		"fold": 	'tree-icon icon-fold',
		"leaf": 	'tree-icon icon-leaf',
		"add":		'tree-icon icon-add',
		"delete":	'tree-icon icon-delete',
		"save": 	'tree-icon icon-save',
		"cancel":	'tree-icon icon-cancel',
	}
}

EditTree.prototype = {
	init: function (param){
		this.p =  $.extend(param);
		this.container = $(this.p.container);
		this.expandDeep = this.p.expandDeep==null ? 1 : this.p.expandDeep;
		this.busyHandler = this.p.busyHandler || this.busyTip;
		this.addNodeHandler = this.p.addHandler;
		this.editNodeHandler = this.p.editHandler;
		this.deleteNodeHandler = this.p.deleteHandler;
		if(this.p.icon){
			for(var key in this.p.icon){				
				this.icon[key] = this.p.icon[key];
			}
		}	
		var treeDom = this.getTreeDom(this.p.data);
		this.container.addClass('edit-tree');
		this.container.empty().append(treeDom);
		this.bindContainerEvent();
		this.bindTreeEvent(treeDom);
		this.expandTree(treeDom, this.expandDeep);
	},

	// 根据数据生成树
	getTreeDom: function (dic){
		if(!dic || dic.length==0) {
			return null;
		}
		var dl = $('<dl><dt></dt></dl>');
		for(var i=0; i<dic.length; i++){
			// 递归获取节点索引			
			this.nodeIndex.push(i);
			var deep =  this.nodeIndex.length;
			// 递归生成子树
			var childTree = this.getTreeDom(dic[i][this.p.listField]);
			var dd = $(
					'<dd>\
						<h6>\
							<a class="expand-btn '+ (childTree ? this.icon.expand : this.icon.leaf) +'"></a>\
							<span class="node-text"'
							+ (dic[i]['modifyAble']==false ? ' data-mdf-able="false"' : '') 
							+ ((dic[i]['addAble']==false || (this.p.addDeep && (this.p.addDeep<deep))&&dic[i]['addAble']!=true) ? ' data-add-able="false"' : '') 
							+ (dic[i]['editAble']==false ? ' data-edit-able="false"' : '') 
							+ (dic[i]['delAble']==false ? ' data-del-able="false"' : '') 
							+' data-deep="'+ deep +'"'
							+' data-parent-id="'+ (dic[i][this.p.pidField] || 0) +'"'
							+' data-node-id="'+ (dic[i][this.p.idField] || 0) +'"'
							+'>'+ dic[i][this.p.nameField]+'</span>\
						</h6>\
					</dd>'
				);
			if(childTree){
				dd.append(childTree);
			}
			dl.append(dd);
			this.nodeIndex.pop();
		}
		return dl;
	},

	// 鼠标左键点击清除“新增”、“删除”按钮
	bindContainerEvent: function(){
		this.container.click(function(){
			var isOptbar = $(event.target).parent().hasClass('opt-bar');
			if(!isOptbar){
				this.removeOptbar();
			}
		}.bind(this));
	},

	// 监听树的点击事件
	bindTreeEvent: function(tree){
		// 绑定展开按钮事件
		tree.find('.expand-btn').click(function(){
			var dl = $(event.target).parent().siblings('dl');
			this.expandNode(dl);
		}.bind(this));

		// 绑定节点名称点击事件
		tree.find('.node-text').each(function(i,el){
			var nodeText = $(el);
			var mdf_able = !(nodeText.attr('data-mdf-able')=='false');
			var add_able = !(nodeText.attr('data-add-able')=='false');
			var del_able = !(nodeText.attr('data-del-able')=='false');
			var edit_able = !(nodeText.attr('data-edit-able')=='false');
			if(!mdf_able){
				// 节点不可修改，不绑定任何事件
				nodeText.addClass('un-modify');
				return;
			}

			if(add_able || del_able){
				// 节点可增或删，绑定鼠标右键事件
				if(!edit_able){
					nodeText.addClass('un-operate');
				}
				nodeText.mousedown(function(){
					if(3 == event.which) {
						this.addOperateBar($(event.target));
					}
				}.bind(this));
			}
			if(edit_able){
				// 节点可编辑，绑定鼠标双击事件
				nodeText.dblclick(function(){
					var node = $(event.target).parent('h6').parent('dd');
					this.editNode(node);
				}.bind(this));
			}
			// 取消默认鼠标右键事件
			nodeText.bind("contextmenu", function(){ return false; });
		}.bind(this));
	},

	// 生成增删按钮栏
	// nodeText：节点元素
	addOperateBar: function(nodeText){		
		if(this.editFlag){
			if(this.busyHandler) {
				setTimeout(this.busyHandler,200);
			};
			return;
		}
		// 当前节点已有按钮，返回
		var optbar = nodeText.siblings('.opt-bar');	
    	if(optbar.length>0){
    		return;
    	}
    	this.removeOptbar();
		var add_able = !(nodeText.attr('data-add-able')=='false');
		var del_able = !(nodeText.attr('data-del-able')=='false');		
    	optbar = $('\
    				<div class="opt-bar">\
    					'+ (add_able ? '<a class="add-btn '+ this.icon.add +'" title="新增"></a>' : '') +'\
    					'+ (del_able ? '<a class="del-btn '+ this.icon.delete +'" title="删除"></a>' : '') +'\
    				</div>\
    				');
    	var node = nodeText.parent('h6').parent('dd');
    	// 绑定新增按钮事件
    	optbar.children('.add-btn').bind('click',function(){
			this.newChildNode(node);
			optbar.remove();
		}.bind(this));
		// 绑定删除按钮事件
		optbar.children('.del-btn').bind('click',function(){
			this.delNode(node);
		}.bind(this));
       	nodeText.parent().append(optbar);
	},

	// 展开或收缩子树
	// dl：子树元素
	// flag：boolean展开或收缩标识
	expandNode: function(dl, flag){	
		if(dl.length==0) return;
		var btn = dl.siblings('h6').children('.expand-btn');
		var child = dl.children('dd');
		if(child.length==0) return;
		var isExpand = dl.hasClass('expand');
		if(!isExpand){
			if(flag==false) return;
			dl.addClass('expand');
			btn.removeClass(this.icon.expand).addClass(this.icon.fold);		
		}
		else if(isExpand){
			if(flag==true) return;
			dl.removeClass('expand');
			btn.removeClass(this.icon.fold).addClass(this.icon.expand);
		}
	},

	// 根据深度展开树
	// tree：树元素
	// deep：number 深度
	expandTree: function(tree, deep){
		var seletor = '';
		for(; deep>0; deep--){
			if(seletor==''){
				this.expandNode(tree, true);
			}
			else{
				this.expandNode(tree.find(seletor), true);
			}
			seletor += '> dd > dl';
		}
	},

	// 新增子节点
	// node：新节点的父元素
	newChildNode: function(node){
		var dl = node.children('dl');
		if(dl.length==0) {
			dl = $('<dl><dt></dt></dl>');
			node.append(dl);
		}
		// 根据节点深度设置新节点默认名称
		var nodeName;
		var deep = Number(node.find('> h6 > .node-text').attr('data-deep'));
		var add_able = (this.p.addDeep==null || (deep<this.p.addDeep)) ? true : false;
		var pid = node.find('> h6 > .node-text').attr('data-node-id');
		if(this.p.defaultName instanceof Array){
			try{
				nodeName = this.p.defaultName[(deep-1)] || this.newNodeName;
			}catch(e){}
		}
		var newNode = $(
					'<dd>\
						<h6>\
							<i class="expand-btn '+ this.icon.leaf +'"></i>\
							<span class="node-text"'
							+	' data-deep="'+ (deep+1) +'"'
							+ 	(add_able ? '' : ' data-add-able="false"') 
							+	' data-parent-id="'+ pid +'"'
							+	' data-node-id="0"'
							+'>'+ nodeName +'</span>\
						</h6>\
					</dd>'
				);
		
		dl.append(newNode);
		this.onChildChange(dl.parent('dd'));
		// 绑定子节点事件
		this.bindTreeEvent(newNode);
		// 设置编辑状态
		this.editNode(newNode);
		// 展开子树
		this.expandNode(dl, true);
	},

	// 删除节点
	// node：删除节点的父元素
	delNode: function(node){
		var nodeText = node.find('> h6 > .node-text');
		var child = node.find('> dl > dd');
		var pnode = node.parent('dl').parent('dd');
		if(this.deleteNodeHandler){
			var dic = {
				"pid": nodeText.attr('data-parent-id'),
				"nid": nodeText.attr('data-node-id'),
				"child": child.length
			};
			// 调用删除方法，处理回调
			this.deleteNodeHandler(dic, function(){
				node.remove();
				this.onChildChange(pnode);
			}.bind(this));
		}		
	},

	// 编辑节点
	// 待编辑节点元素
	editNode: function(node){
		if(this.editFlag){
			if(this.busyHandler) this.busyHandler();
			return;
		}
		var nodeText = node.find('> h6 > .node-text');
		if(nodeText.attr('data-edit-able')=='false'){
			return;
		}
		var pnode = node.parent('dl').parent('dd');
		// 生成编辑栏
		var txt = nodeText.text();
		var inpbar = $('\
					<div class="input-bar">\
						<input type="text" class="node_input" value="'+ txt +'" spellcheck="false" />\
						<a class="save-btn '+ this.icon.save +'" title="保存"></a>\
						<a class="cancel-btn '+ this.icon.cancel +'" title="取消"></a>\
					</div>\
			');
		var inp = inpbar.children('input');
		// 绑定保存按钮事件
		inpbar.children('.save-btn').click(function(){
			var dic = {
					"pid": nodeText.attr('data-parent-id'),
					"nid": nodeText.attr('data-node-id'),
					"text": inp.val()
				};
			if(dic.nid==0){
				// 调用新增节点方法，处理回调
				if(!this.addNodeHandler) return;
				this.addNodeHandler(dic, function(id){
					inpbar.remove();
					nodeText.attr('data-node-id', id);
					nodeText.text(dic['text']).removeClass('transparent');
					this.editFlag = false;
				}.bind(this));
			}
			else{
				// 调用编辑节点方法，处理回调
				if(!this.editNodeHandler) return;
				this.editNodeHandler(dic, function(){
					inpbar.remove();
					nodeText.text(dic['text']).removeClass('transparent');
					this.editFlag = false;
				}.bind(this));
			}
		}.bind(this));
		// 绑定取消编辑事件
		inpbar.children('.cancel-btn').click(function(ev){
			inpbar.remove();
			nodeText.removeClass('transparent');
			this.editFlag = false;
			var nid = nodeText.attr('data-node-id');
			if(nid==0){
				node.remove();
				this.onChildChange(pnode);
			}
		}.bind(this));
		nodeText.addClass('transparent').parent().append(inpbar);
		inp.focus();
		this.editFlag = true;
	},

	// 删除增删按钮
	removeOptbar: function(){
		this.container.find('.opt-bar').remove();
	},

	// 重置树的展开状态
	// node：树元素
	onChildChange: function(node){
		if(node.length==0) return;
		var childNode = node.find('> dl > dd');
		if(childNode.length>0){
			var isExpand = node.children('dl').hasClass('expand');
			if(!isExpand){
				node.find('> h6 > .expand-btn').removeClass(this.icon.leaf).addClass(this.icon.expand);
			}
		}
		else{
			node.children('dl').remove();
			node.find('> h6 > .expand-btn').removeClass(this.icon.expand).removeClass(this.icon.fold).addClass(this.icon.leaf);
		}
	},

	// 编辑状态默认提示
	busyTip: function(){
		alert('你有其他节点正在编辑');
	},

}














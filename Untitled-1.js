
				{
          let el = window.getSelection().focusNode;
          let path = [];
          while (el.nodeName.toLowerCase() != 'html') {
            path.unshift(el.nodeName + (el.className ? ' class="' + el.className + '"' : ''));
            el = el.parentNode;
          }
          console.log(path);
        }
          
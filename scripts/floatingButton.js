const floatingButton = () => {
  if (document.getElementById('floating-settings-widget')) return;
  
  const wrapper = document.createElement('div');
  wrapper.id = 'floating-settings-widget';
  Object.assign(wrapper.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '999999',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  });
  
  const iconBtn = document.createElement('button');
  Object.assign(iconBtn.style, {
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '12px',
    cursor: 'pointer',
    borderRadius: '50%',
    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: '2',
    width: '64px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });
  
  // Create image icon
  const icon = document.createElement('img');
  icon.src = 'https://raw.githubusercontent.com/analytics-debugger/stape-gtm-helper-extension/refs/heads/main/icons/icon128.png';
  icon.alt = 'Stape GTM Helper';
  Object.assign(icon.style, {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    display: 'block'
  });
  
  iconBtn.appendChild(icon);
  
  // Add hover effect
  iconBtn.addEventListener('mouseenter', () => {
    iconBtn.style.transform = 'scale(1.1)';
    iconBtn.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.6)';
  });
  
  iconBtn.addEventListener('mouseleave', () => {
    iconBtn.style.transform = 'scale(1)';
    iconBtn.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
  });
  
  wrapper.appendChild(iconBtn);
  
  // --- Settings Menu ---
  const menu = document.createElement('div');
  Object.assign(menu.style, {
    position: 'absolute',
    bottom: '80px',
    right: '0',
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    padding: '24px',
    minWidth: '350px',
    maxWidth: '400px',
    display: 'none',
    flexDirection: 'column',
    fontSize: '14px',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  });
  
  // Menu header
  const header = document.createElement('div');
  header.textContent = 'Stape GTM Helper';
  Object.assign(header.style, {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f0f0f0'
  });
  menu.appendChild(header);
  
  const settings = [
    {
      key: 'jsonFormatter',
      label: 'JSON Formatter',
      desc: 'Show beautified JSON of incoming/outgoing requests in server GTM preview',
      on: () => {
      },
      off: () => {
      }
    },
    {
      key: 'urlFormatter',
      label: 'Request URL Formatter',
      desc: 'Show beautified URL parameters of incoming/outgoing requests in server GTM preview',
      on: () => {
        if (window.__stape__ && window.__stape__.urlReportEnhancer) {
           window.__stape__.urlReportEnhancer.enable();
        }
      },
      off: () => {
      if (window.__stape__ && window.__stape__.urlReportEnhancer) {
           window.__stape__.urlReportEnhancer.disable();
        }      }
    },
    {
      key: 'tagTypeColor',
      label: 'Tag Type Color',
      desc: 'Add color indication for different tag types e.g. orange for GA4, blue for Meta etc.',
      on: () => {
        console.log('Tag Type Color enabled', window.__stape__);
        if (window.__stape__ && window.__stape__.GTMCardHighlighter) {
          window.__stape__.GTMCardHighlighter.enable();
        }
      },
      off: () => {
        console.log('Tag Type Color disabled', window.__stape__);
        if (window.__stape__ && window.__stape__.GTMCardHighlighter) {
          window.__stape__.GTMCardHighlighter.disable();
        }
      }
    },
    {
      key: 'tagStatusColor',
      label: 'Tag Status Color',
      desc: 'Highlight failed tag statuses in red for web & server GTM preview',
      on: () => {
        
      },
      off: () => {
        
      }
    },
    {
      key: 'consentStatus',
      label: 'Consent Status',
      desc: 'Display consent parameters in server GTM preview based on GA4/Data Tag payloads',
      on: () => {
        window.__stape__.consentReporter.enable()
      },
      off: () => {
        window.__stape__.consentReporter.disable()
      }
    }
  ];
  
  settings.forEach((setting, index) => {
    const item = document.createElement('div');
    Object.assign(item.style, {
      marginBottom: index === settings.length - 1 ? '0' : '20px',
      padding: '0'
    });
    
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '16px'
    });
    
    const textContainer = document.createElement('div');
    Object.assign(textContainer.style, {
      flex: '1'
    });
    
    const title = document.createElement('div');
    title.textContent = setting.label;
    Object.assign(title.style, {
      fontWeight: '500',
      color: '#1a1a1a',
      marginBottom: '4px',
      fontSize: '15px'
    });
    
    const desc = document.createElement('div');
    desc.textContent = setting.desc;
    Object.assign(desc.style, {
      color: '#6b7280',
      fontSize: '13px',
      lineHeight: '1.4'
    });
    
    textContainer.appendChild(title);
    textContainer.appendChild(desc);
    
    // Custom toggle switch
    const toggleContainer = document.createElement('div');
    Object.assign(toggleContainer.style, {
      position: 'relative',
      display: 'inline-block',
      width: '48px',
      height: '28px',
      flexShrink: '0'
    });
    
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.dataset.key = setting.key;
    Object.assign(toggleInput.style, {
      opacity: '0',
      width: '0',
      height: '0',
      position: 'absolute'
    });
    
    const toggleSlider = document.createElement('span');
    Object.assign(toggleSlider.style, {
      position: 'absolute',
      cursor: 'pointer',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: '#e5e7eb',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      borderRadius: '14px',
      boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
    });
    
    const toggleButton = document.createElement('span');
    Object.assign(toggleButton.style, {
      position: 'absolute',
      content: '',
      height: '20px',
      width: '20px',
      left: '4px',
      bottom: '4px',
      backgroundColor: 'white',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      borderRadius: '50%',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
    });
    
    toggleSlider.appendChild(toggleButton);
    toggleContainer.appendChild(toggleInput);
    toggleContainer.appendChild(toggleSlider);
    
    // Toggle functionality
    const updateToggle = (checked) => {
      if (checked) {
        toggleSlider.style.backgroundColor = '#667eea';
        toggleButton.style.transform = 'translateX(20px)';
        toggleButton.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
      } else {
        toggleSlider.style.backgroundColor = '#e5e7eb';
        toggleButton.style.transform = 'translateX(0px)';
        toggleButton.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
      }
    };
    
    toggleContainer.addEventListener('click', () => {
      toggleInput.checked = !toggleInput.checked;
      updateToggle(toggleInput.checked);
      
      // Execute the appropriate callback
      try {
        if (toggleInput.checked && setting.on) {
          setting.on();
        } else if (!toggleInput.checked && setting.off) {
          setting.off();
        }
      } catch (error) {
        console.error(`Error executing ${toggleInput.checked ? 'on' : 'off'} callback for ${setting.key}:`, error);
      }
    });
    
    // Initialize toggle to off state
    updateToggle(false);
    
    row.appendChild(textContainer);
    row.appendChild(toggleContainer);
    item.appendChild(row);
    menu.appendChild(item);
  });
  
  wrapper.appendChild(menu);
  
  // --- Toggle menu ---
  iconBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = menu.style.display === 'flex';
    menu.style.display = isVisible ? 'none' : 'flex';
    
    if (!isVisible) {
      // Add entrance animation
      menu.style.opacity = '0';
      menu.style.transform = 'translateY(10px) scale(0.95)';
      menu.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
      
      requestAnimationFrame(() => {
        menu.style.opacity = '1';
        menu.style.transform = 'translateY(0px) scale(1)';
      });
    }
  });
  
  // --- Close on outside click ---
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      menu.style.display = 'none';
    }
  });
  
  // --- Close on escape key ---
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.style.display === 'flex') {
      menu.style.display = 'none';
    }
  });
  
  document.body.appendChild(wrapper);
};

export default floatingButton;
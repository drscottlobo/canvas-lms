define([
  'react',
  'i18n!appointment_groups',
  'instructure-ui/Button',
  'instructure-ui/Grid',
], (React, I18n, {default: Button}, {default: Grid, GridCol, GridRow}) => {

  class ContextSelector extends React.Component {
    static propTypes = {
      appointmentGroup: React.PropTypes.object,
      contexts: React.PropTypes.array,
      className: React.PropTypes.string
    }

    constructor () {
      super()
      this.contextCheckboxes = {}
      this.state = {
        showDropdown: false,
        selectedContexts: new Set(),
        selectedSubContexts: new Set(),
        expandedContexts: new Set(),
      }
    }

    componentWillReceiveProps(nextProps) {
      this.setState({
        selectedContexts: new Set(nextProps.appointmentGroup.context_codes),
        selectedSubContexts: new Set(nextProps.appointmentGroup.sub_context_codes),
        expandedContexts: new Set(),
      })
    }

    setIndeterminates() {
      for (let context in this.contextCheckboxes) {
        if (this.contextCheckboxes[context]) {
          this.contextCheckboxes[context].indeterminate = this.isContextIndeterminate(context)
        }
      }
    }

    componentDidMount() {
      this.setIndeterminates()
    }

    componentDidUpdate(previousProps) {
      this.setIndeterminates()
    }

    handleContextSelectorButtonClick = (e) => {
      e.preventDefault()
      this.setState({
        showDropdown: !this.state.showDropdown
      })
    }

    handleDoneClick = (e) => {
      e.preventDefault()
      this.dropdownButton.focus()
      this.setState({
        showDropdown: false
      })
    }

    isSubContextChecked = (context, subContext) => {
      return this.state.selectedSubContexts.has(subContext) || (this.isContextChecked(context) && !this.isContextIndeterminate(context))
    }

    isSubContextDisabled = (context, subContext) => {
      return this.isContextDisabled(context) || !!this.props.appointmentGroup.sub_context_codes.find(scc=>scc === subContext)
    }

    isContextChecked = (context) => {
      return this.state.selectedContexts.has(context)
    }

    isContextIndeterminate = (context) => {
      if (!this.state.selectedContexts.has(context)) { return false }
      let subContexts = this.subContextsForContext(context)
      return subContexts.some(subContext => this.state.selectedSubContexts.has(subContext))
    }

    isContextDisabled = (context) => {
      return !!this.props.appointmentGroup.context_codes.find(c=> c === context)
    }

    subContextsForContext = (context) => {
      return this.props.contexts.find(c=>c.asset_string === context).sections.map(s=>s.asset_string)
    }

    toggleCourse = (course, select) => {
      // set course, unset sections
      const contexts = new Set(this.state.selectedContexts)
      const subContexts = new Set(this.state.selectedSubContexts)
      const subContextsToRemove = this.subContextsForContext(course)
      if (select) { contexts.add(course) } else { contexts.delete(course) }
      for (let subContext of subContextsToRemove) { subContexts.delete(subContext) }
      this.setState({
        selectedContexts: contexts,
        selectedSubContexts: subContexts
      })
    }

    toggleSection = (context, section, select) => {
      // appointment groups do this thing where if all of the sub contexts in a contexts are
      // included, we don't store them in sub_context_codes. we make an intermediate subContexts
      // set that reflects which subcontexts are checked.
      const contexts = new Set(this.state.selectedContexts)
      const subContexts = new Set(this.state.selectedSubContexts)
      const siblingSubContexts = new Set(this.subContextsForContext(context))
      let checkedSubContexts = new Set()
      for (let subContext of subContexts) {
        if (siblingSubContexts.has(subContext)) {
          checkedSubContexts.add(subContext)
        }
      }

      // make implicit checked status explicit
      if (checkedSubContexts.size === 0 && contexts.has(context)) {
        checkedSubContexts = new Set(siblingSubContexts)
      }

      if (select) { checkedSubContexts.add(section) } else { checkedSubContexts.delete(section) }

      // start with no sub contexts selected and then add the ones that are checked
      for (let subContext of siblingSubContexts) { subContexts.delete(subContext) }
      if ([...siblingSubContexts].every(ssc => checkedSubContexts.has(ssc))) {
        // if they're all checked, we don't actually store them as selected
        contexts.add(context)
      } else if (checkedSubContexts.size > 0) {
        for (let subContext of checkedSubContexts) { subContexts.add(subContext) }
        contexts.add(context)
      } else {
        // no sub contexts were checked
        contexts.delete(context)
      }
      this.setState({
        selectedContexts: contexts,
        selectedSubContexts: subContexts
      })
    }

    toggleCourseExpanded = (course) => {
      let contexts = new Set(this.state.expandedContexts)
      if (contexts.has(course)) { contexts.delete(course) } else { contexts.add(course) }
      this.setState({expandedContexts: contexts})
    }

    contextName = (asset_string) => {
      for (let context of this.props.contexts) {
        if (!context.sections) { continue } // a user context, probably
        if (context.asset_string === asset_string) { return context.name }
        for (let subContext of context.sections) {
          if (subContext.asset_string === asset_string) { return subContext.name }
        }
      }
    }

    contextAndCountText = (contextSet) => {
      let contextName = this.contextName(contextSet.values().next().value) || ''
      if (contextSet.size > 1) {
        return I18n.t({one: '%{contextName} and %{count} other',
                       other: '%{contextName} and %{count} others'},
                      {contextName: contextName,
                      count: contextSet.size - 1})
      } else {
        return contextName
      }
    }

    buttonText = () => {
      let text = ''
      if (this.state.selectedSubContexts.size > 0) {
        text = this.contextAndCountText(this.state.selectedSubContexts)
      } else if (this.state.selectedContexts.size > 0) {
        text = this.contextAndCountText(this.state.selectedContexts)
      }
      return text || I18n.t('Select Calendars')
    }

    renderSections (context) {
      return (
        <div id={`${context.asset_string}_sections`} className={this.state.expandedContexts.has(context) ? '' : 'hiddenSection'}>
          {
            context.sections.map(section => {
                return (
                  <div className="sectionItem" key={section.asset_string}>
                    <input
                      id={`${section.asset_string}_checkbox`}
                      key={`${section.asset_string}_checkbox`}
                      type="checkbox"
                      onChange={() => this.toggleSection(context.asset_string, section.asset_string, !this.isSubContextChecked(context.asset_string, section.asset_string))}
                      value={section.asset_string}
                      defaultChecked={this.isSubContextChecked(context.asset_string, section.asset_string)}
                      checked={this.isSubContextChecked(context.asset_string, section.asset_string)}
                      disabled={this.isSubContextDisabled(context.asset_string, section.asset_string)}
                    />
                    <label htmlFor={`${section.asset_string}_checkbox`}>{section.name}</label>
                  </div>
                )
            })
          }
        </div>
      )
    }

    renderListItems () {
      return (
      <div>
        {
          this.props.contexts.map(context => {
            if (context.asset_string.indexOf('user') === -1) {
              let expanded = this.state.expandedContexts.has(context)
              let inputId = `${context.asset_string}_checkbox`
              return (
                <div className="CourseListItem" key={context.asset_string}>
                  <i role="button" aria-controls={`${context.asset_string}_sections`} aria-expanded={expanded} onClick={() => this.toggleCourseExpanded(context)} className={`icon-arrow-${expanded ? 'down' : 'right'}`}><span className="screenreader-only">{context.name}</span></i>
                  <input
                    ref={(checkbox) => { this.contextCheckboxes[context.asset_string] = checkbox }}
                    id={inputId}
                    type="checkbox"
                    onChange={() => this.toggleCourse(context.asset_string, !this.isContextChecked(context.asset_string))}
                    value={context.asset_string}
                    defaultChecked={this.isContextChecked(context.asset_string)}
                    checked={this.isContextChecked(context.asset_string)}
                    disabled={this.isContextDisabled(context.asset_string)}
                  />
                  <label htmlFor={inputId}>{context.name}</label>
                  {this.renderSections(context)}
                </div>
              )
            }
          })
        }
      </div>
      )
    }

    render () {
      const classes = (this.props.className) ? `ContextSelector ${this.props.className}` :
                                               'ContextSelector'

      return (
        <div className={classes} {...this.props}>
          <Button
            ref={(c) => {this.dropdownButton = c }}
            aria-expanded={this.state.showDropdown}
            aria-controls="context-selector-dropdown"
            onClick={this.handleContextSelectorButtonClick}
          >
            {this.buttonText()}
          </Button>
          <div id="context-selector-dropdown" className={`ContextSelector__Dropdown ${this.state.showDropdown ? 'show' : 'hidden'}`}>
            <Grid>
              <GridRow hAlign="start">
                <GridCol>
                  {this.renderListItems()}
                </GridCol>
              </GridRow>
              <GridRow hAlign="end">
                <GridCol width="auto">
                  <Button onClick={this.handleDoneClick} size="small" >{I18n.t('Done')}</Button>
                </GridCol>
              </GridRow>
            </Grid>
          </div>
        </div>
      )
    }
  }

  return ContextSelector
})

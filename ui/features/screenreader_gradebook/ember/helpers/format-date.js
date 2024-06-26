//
// Copyright (C) 2014 - present Instructure, Inc.
//
// This file is part of Canvas.
//
// Canvas is free software: you can redistribute it and/or modify it under
// the terms of the GNU Affero General Public License as published by the Free
// Software Foundation, version 3 of the License.
//
// Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
// WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
// A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
// details.
//
// You should have received a copy of the GNU Affero General Public License along
// with this program. If not, see <http://www.gnu.org/licenses/>.

import Ember from 'ember'
import * as tz from '@instructure/datetime'

const {Handlebars} = Ember

// #
// Formats a parsable date with normal strftime formats
//
// ```html
// {{format-date datetime '%b %d'}}
// ```
export default Handlebars.registerBoundHelper('format-date', (datetime, format) => {
  if (datetime == null) {
    return
  }
  if (typeof format !== 'string') {
    format = '%b %e, %Y %l:%M %P'
  }
  return tz.format(tz.parse(datetime), format)
})

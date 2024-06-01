/*
 * Copyright (C) 2024 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import React from 'react'
import {fireEvent, render} from '@testing-library/react'
import {ExtensionsTableInner} from '../ExtensionsTable'
import {mockPageOfRegistrations} from './helpers'
import {BrowserRouter} from 'react-router-dom'

// Need to use ExtensionsTableInner because ExtensionsTable uses Responsive
// which doesn't seem to work in these tests -- both media queries are
// satisfied and the component gets two "layout" properties
describe('ExensionsTableInner', () => {
  it('calls the deleteApp callback when the Delete App menu item is clicked', async () => {
    const deleteApp = jest.fn()
    const wrapper = render(
      <BrowserRouter>
        <ExtensionsTableInner
          tableProps={{
            extensions: mockPageOfRegistrations('Hello', 'World'),
            dir: 'asc',
            sort: 'name',
            updateSearchParams: () => {},
            deleteApp,
          }}
          responsiveProps={undefined}
        />
      </BrowserRouter>
    )

    const kebabMenuIcon = await wrapper.findAllByText('More Registration Options')
    fireEvent.click(kebabMenuIcon[0])
    const deleteButton = await wrapper.findByText('Delete App')

    expect(deleteApp).not.toHaveBeenCalled()
    fireEvent.click(deleteButton)
    expect(deleteApp).toHaveBeenCalled()
  })
})

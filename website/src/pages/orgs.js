import React, { useState, useCallback, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useQuery } from 'graphql-hooks'
import {
  Info,

  Split,
  Box,
  Text,

  DataView,
  IdentityBadge,
  Button,
  SyncIndicator,

  textStyle,

  useLayout,
  useTheme,

  GU
} from '@aragon/ui'
import { format } from 'date-fns'
import { WindowedPagination } from '../components/WindowedPagination'
import { SortHeader } from '../components/SortHeader'
import {
  Filter,

  FILTER_TYPE_DATE_RANGE,
  FILTER_TYPE_LIST,
  FILTER_TYPE_CHECKBOX
} from '../components/Filter'
import { NavTabs } from '../components/NavTabs/NavTabs'
import SmartLink from '../components/SmartLink/SmartLink'
import useSort from '../hooks/sort'
import openSafe from '../utils/open-safe'
import { formatNumber } from '../utils/numbers'
import { isProfileEmpty } from '../utils/utils'

const ORGANISATIONS_QUERY = `
  query(
    $before: Cursor
    $after: Cursor
    $sort: OrganisationConnectionSort
    $filter: OrganisationConnectionFilter
  ) {
    organisations(
      before: $before,
      after: $after,
      sort: $sort,
      filter: $filter
    ) {
      nodes {
        id
        address
        ens
        kit
        createdAt
        aum
        activity
        score
        profile {
          name
          description
          icon
          links
        }
      }
      pageInfo {
        startCursor
        endCursor
        hasPreviousPage
        hasNextPage
      }
      totalCount
      totalAUM
      totalActivity
    }
  }
`

const KITS = [{
  label: 'Company',
  value: ['0x705Cd9a00b87Bb019a87beEB9a50334219aC4444', '0x7f3ed10366826a1227025445D4f4e3e14BBfc91d', '0xd737632caC4d039C9B0EEcc94C12267407a271b5']
}, {
  label: 'Multisig',
  value: ['0x41bbaf498226b68415f1C78ED541c45A18fd7696', '0x87aa2980dde7d2D4e57191f16BB57cF80bf6E5A6']
}, {
  label: 'Membership',
  value: ['0x67430642C0c3B5E6538049B9E9eE719f2a4BeE7c']
}, {
  label: 'Open Enterprise',
  value: ['0xc54c5dB63aB0E79FBb9555373B969093dEb17859']
}, {
  label: 'Reputation',
  value: ['0x3a06A6544e48708142508D9042f94DDdA769d04F']
}, {
  label: 'Fundraising',
  value: ['0xd4bc1aFD46e744F1834cad01B2262d095DCB6C9B']
}, {
  label: 'Dandelion',
  value: ['0xbc2A863ef2B96d454aC7790D5A9E8cFfd8EccBa8']
}]

const ONE_BILLION = 1000000000

const Orgs = ({ history }) => {
  const [sort, sortBy] = useSort('score', 'DESC')
  const [pagination, setPagination] = useState(['after'])
  const [filter, setFilter] = useState()
  const { layoutName } = useLayout()
  const theme = useTheme()

  const compactMode = layoutName === 'small'

  const page = useCallback(
    (direction, cursor) => setPagination([direction, cursor])
  )

  // Reset pagination after a new sort or filter has been applied
  useEffect(() => {
    setPagination([])
  }, [sort, filter])

  const {
    loading,
    error,
    data
  } = useQuery(ORGANISATIONS_QUERY, {
    variables: {
      sort: {
        [sort[0]]: sort[1]
      },
      filter,
      [pagination[0]]: pagination[1]
    },

    // This is kind of ugly, but this identity function
    // is here to ensure that we still have data to display
    // while loading the next set of data.
    updateData: (_, data) => data
  })

  if (error) {
    return <Info mode='error'>An error occurred. Try again.</Info>
  }

  const firstFetch = loading && !data
  return <div>
    <NavTabs
      items={[{
        label: 'Organisations',
        path: '/orgs'
      }, {
        label: 'Apps',
        path: '/apps'
      }]}
    />
    <Split
      primary={<div>
        {!firstFetch && (
          <DataView
            heading={<Filter
              filters={[{
                type: FILTER_TYPE_LIST,
                name: 'kit',
                label: 'Templates',
                items: KITS
              }, {
                type: FILTER_TYPE_DATE_RANGE,
                name: 'createdAt'
              }, {
                type: FILTER_TYPE_CHECKBOX,
                label: 'Profile',
                name: 'profile'
              }]}
              onChange={setFilter}
            />}
            fields={[
              <SortHeader
                key='sort-org'
                label='Organisation'
                onClick={() => sortBy('ens')}
                sortOrder={sort[0] === 'ens' && sort[1]}
              />,
              {
                label: (
                  <SortHeader
                    key='sort-aum'
                    label='AUM'
                    onClick={() => sortBy('aum')}
                    help={{
                      hint: 'What is AUM?',
                      body: 'AUM (or Assets Under Management) tracks the total DAI value of ANT, ETH, DAI, SAI and USDC held by Apps associated with an Organization.'
                    }}
                    sortOrder={sort[0] === 'aum' && sort[1]}
                  />
                ),
                align: 'end'
              },
              {
                label: (
                  <SortHeader
                    key='sort-activity'
                    label='Activity (90 days)'
                    onClick={() => sortBy('activity')}
                    help={{
                      hint: 'What is Activity?',
                      body: 'Activity tracks the volume of transactions flowing through Apps associated with an Organization.'
                    }}
                    sortOrder={sort[0] === 'activity' && sort[1]}
                  />
                ),
                align: 'end'
              },
              {
                label: (
                  <SortHeader
                    key='sort-score'
                    label='Score'
                    onClick={() => sortBy('score')}
                    help={{
                      hint: 'What is Organization Score?',
                      body: 'Organization Score is a relative weighted ranking of organizations derived from AUM, Activity, and ANT held by an organization expressed as a percentage.'
                    }}
                    sortOrder={sort[0] === 'score' && sort[1]}
                    align='end'
                  />
                ),
                align: 'end'
              },
              <SortHeader
                key='sort-created'
                label='Created'
                onClick={() => sortBy('createdAt')}
                sortOrder={sort[0] === 'createdAt' && sort[1]}
              />
            ]}
            entries={data.organisations.nodes}
            renderEntry={({
              address,
              ens,
              createdAt,
              aum,
              activity,
              profile,
              score
            }) => [
              profile && profile.icon && profile.name ? (
                <div
                  key='org-addr'
                  css={`
                  display: flex;
                  align-items: center;
                  margin-top: ${1 * GU}px;
                `}
                >
                  <img src={profile.icon} width='32px' height='auto' css={`margin-right: ${1 * GU}px;`} />
                  <IdentityBadge label={profile.name} badgeOnly />
                </div>
              ) : (
                <div css={`margin-top: ${1.5 * GU}px;`}>
                  <IdentityBadge
                    key='org-addr'
                    entity={address}
                    label={(ens || '')}
                    popoverTitle={(ens || '')}
                  />
                </div>),
              <div key='org-aum'>
                ◈ {formatNumber(aum, 2, ONE_BILLION)}
              </div>,
              <div key='org-activity'>
                {formatNumber(activity)}
              </div>,
              <div key='org-score'>
                {formatNumber(score * 100, 2)}
              </div>,
              <div key='org-created-at'>
                {format(new Date(createdAt), 'dd/MM/y')}
              </div>
            ]}
            renderEntryActions={({ address, ens }) => [
              <Button
                key='view-profile'
                size='small'
                onClick={() => history.push(`/profile?dao=${address}`)}
                css='margin-right: 8px;'
              >View profile
              </Button>,
              <Button
                key='open-org'
                size='small'
                mode='strong'
                onClick={() => openSafe(`https://mainnet.aragon.org/#/${ens || address}`)}
              >
                Open
              </Button>
            ]}
            renderEntryExpansion={({ profile }) => {
              if (isProfileEmpty(profile)) {
                return null
              }
              const profileInfo = [
                <div
                  key='description'
                  css={`
                    width: 100%;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    grid-gap: ${3 * GU}px;
                    align-items: center;
                    justify-content: space-between;
                    align-items: start;
                    margin-top: ${0.5 * GU}px;
                  `}
                >
                  <div
                    css={`
                      align-self: center;
                      ${textStyle('label2')}
                      color: ${theme.contentSecondary}
                    `}
                  >
                    Description
                  </div>
                  <div
                    css={`
                      display: flex; justify-content: flex-end;
                      ${textStyle('body3')}
                    `}
                  >
                    {profile.description || 'No description available.'}
                  </div>
                </div>,
                <div
                  key='links'
                  css={`
                    width: 100%;
                    display: grid;
                    grid-template-columns: auto 1fr;
                    grid-gap: ${3 * GU}px;
                    align-items: center;
                    justify-content: space-between;
                    align-items: start;
                    margin-top: ${1 * GU}px;
                `}
                >
                  <div
                    css={`
                      align-self: center;
                      ${textStyle('label2')}
                      color: ${theme.contentSecondary}
                    `}
                  >
                    Links
                  </div>
                  <div css={`
                    display: flex;
                    justify-content: flex-end;
                    text-overflow: ellipsis;
                    overflow: hidden;
                    white-space: nowrap;
                    ${textStyle('body3')}
                    ${compactMode && `
                      justify-content: flex-end;
                    `}
                  `}
                  >
                    {profile.links.length > 0 ? profile.links.slice(0, 2).map(link => (
                      <SmartLink
                        key={link}
                        url={link}
                        css={`
                          display: block;
                          margin-left: ${1 * GU}px;
                          padding-left: ${1 * GU}px !important;
                        `}
                      />
                    )) : 'No links available.'}
                  </div>
                </div>
              ]
              return compactMode ? <div css='width: 100%;'>{profileInfo}</div> : profileInfo
            }}
          />
        )}
        {!firstFetch && (
          <WindowedPagination
            onPage={page}
            pageInfo={data.organisations.pageInfo}
          />
        )}
        {loading && <SyncIndicator label='Loading…' />}
      </div>}
      secondary={
        <>
          <Box>
            <Text.Block size='xlarge'>{firstFetch ? '-' : formatNumber(data.organisations.totalCount)}</Text.Block>
            <Text>organisations</Text>
          </Box>
          <Box>
            <Text.Block size='xlarge'>◈ {firstFetch ? '-' : formatNumber(data.organisations.totalAUM)}</Text.Block>
            <Text>total AUM</Text>
          </Box>
          <Box>
            <Text.Block size='xlarge'>{firstFetch ? '-' : formatNumber(data.organisations.totalActivity)}</Text.Block>
            <Text>total activities (90 days)</Text>
          </Box>
        </>
      }
    />
  </div>
}

Orgs.propTypes = {
  history: PropTypes.object
}

export default Orgs
